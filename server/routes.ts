import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { deviceTokens, familyConnections, appUsers, connectionRequests, tasks } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import { uploadToS3, deleteFromS3 } from "./aws-s3";
import { sendPushNotification, sendPushNotificationsToUsers } from "./aws-sns";
import { wsManager } from "./websocket";
import { awsConfig, validateAwsConfig } from "./aws-config";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate AWS configuration on startup
  validateAwsConfig();

  // Serve uploaded images statically (fallback for local storage)
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  });

  // Upload image endpoint - uses S3 if configured, otherwise local storage
  app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Try to upload to S3 first
      if (awsConfig.accessKeyId && awsConfig.secretAccessKey && awsConfig.s3Bucket) {
        try {
          const s3Key = `images/${req.file.filename}`;
          const imageUrl = await uploadToS3(req.file.path, s3Key, req.file.mimetype);
          
          // Clean up local file after S3 upload
          fs.unlinkSync(req.file.path);
          
          return res.json({ success: true, url: imageUrl, filename: req.file.filename });
        } catch (s3Error) {
          console.warn("S3 upload failed, falling back to local storage:", s3Error);
          // Fall through to local storage
        }
      }

      // Fallback to local storage
      const protocol = req.header("x-forwarded-proto") || req.protocol || "https";
      const host = req.header("x-forwarded-host") || req.get("host");
      const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      res.json({ success: true, url: imageUrl, filename: req.file.filename });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Register or update app user (called when user creates profile)
  app.post("/api/app-users", async (req, res) => {
    try {
      const { id, name, role, avatarSvg } = req.body;
      
      if (!id || !name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existingUser = await db.select()
        .from(appUsers)
        .where(eq(appUsers.id, id))
        .limit(1);

      if (existingUser.length > 0) {
        await db.update(appUsers)
          .set({ name, role, avatarSvg })
          .where(eq(appUsers.id, id));
      } else {
        await db.insert(appUsers).values({
          id,
          name,
          role,
          avatarSvg,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error registering app user:", error);
      res.status(500).json({ error: "Failed to register app user" });
    }
  });

  // Get user by ID (validate code exists)
  app.get("/api/app-users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await db.select()
        .from(appUsers)
        .where(eq(appUsers.id, id))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user[0]);
    } catch (error) {
      console.error("Error fetching app user:", error);
      res.status(500).json({ error: "Failed to fetch app user" });
    }
  });

  // Send connection request
  app.post("/api/connection-requests", async (req, res) => {
    try {
      const { fromUserId, fromUserName, fromUserRole, fromUserAvatar, toUserId } = req.body;
      
      if (!fromUserId || !fromUserName || !fromUserRole || !toUserId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if target user exists
      const targetUser = await db.select()
        .from(appUsers)
        .where(eq(appUsers.id, toUserId))
        .limit(1);

      if (targetUser.length === 0) {
        return res.status(404).json({ error: "User code not found. Please check and try again." });
      }

      // Check for existing pending request
      const existingRequest = await db.select()
        .from(connectionRequests)
        .where(and(
          eq(connectionRequests.fromUserId, fromUserId),
          eq(connectionRequests.toUserId, toUserId),
          eq(connectionRequests.status, "pending")
        ))
        .limit(1);

      if (existingRequest.length > 0) {
        return res.status(409).json({ error: "Request already sent" });
      }

      // Check if already connected (request was accepted)
      const existingConnection = await db.select()
        .from(connectionRequests)
        .where(and(
          or(
            and(eq(connectionRequests.fromUserId, fromUserId), eq(connectionRequests.toUserId, toUserId)),
            and(eq(connectionRequests.fromUserId, toUserId), eq(connectionRequests.toUserId, fromUserId))
          ),
          eq(connectionRequests.status, "accepted")
        ))
        .limit(1);

      if (existingConnection.length > 0) {
        return res.status(409).json({ error: "Already connected to this user" });
      }

      const [newRequest] = await db.insert(connectionRequests).values({
        fromUserId,
        fromUserName,
        fromUserRole,
        fromUserAvatar: fromUserAvatar || null,
        toUserId,
        status: "pending",
      }).returning();

      res.json({ 
        success: true, 
        request: newRequest,
        targetUser: targetUser[0]
      });
    } catch (error) {
      console.error("Error creating connection request:", error);
      res.status(500).json({ error: "Failed to create connection request" });
    }
  });

  // Get incoming connection requests for a user
  app.get("/api/connection-requests/incoming/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const requests = await db.select()
        .from(connectionRequests)
        .where(and(
          eq(connectionRequests.toUserId, userId),
          eq(connectionRequests.status, "pending")
        ));

      res.json(requests);
    } catch (error) {
      console.error("Error fetching incoming requests:", error);
      res.status(500).json({ error: "Failed to fetch incoming requests" });
    }
  });

  // Get outgoing connection requests for a user
  app.get("/api/connection-requests/outgoing/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const requests = await db.select()
        .from(connectionRequests)
        .where(and(
          eq(connectionRequests.fromUserId, userId),
          eq(connectionRequests.status, "pending")
        ));

      // For each request, get the target user info
      const requestsWithTargetInfo = await Promise.all(requests.map(async (req) => {
        const targetUser = await db.select()
          .from(appUsers)
          .where(eq(appUsers.id, req.toUserId))
          .limit(1);
        return {
          ...req,
          toUserName: targetUser[0]?.name || "Unknown",
          toUserRole: targetUser[0]?.role || "child",
          toUserAvatar: targetUser[0]?.avatarSvg || null,
        };
      }));

      res.json(requestsWithTargetInfo);
    } catch (error) {
      console.error("Error fetching outgoing requests:", error);
      res.status(500).json({ error: "Failed to fetch outgoing requests" });
    }
  });

  // Accept connection request
  app.post("/api/connection-requests/:id/accept", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const request = await db.select()
        .from(connectionRequests)
        .where(eq(connectionRequests.id, parseInt(id)))
        .limit(1);

      if (request.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request[0].toUserId !== userId) {
        return res.status(403).json({ error: "Not authorized to accept this request" });
      }

      await db.update(connectionRequests)
        .set({ status: "accepted" })
        .where(eq(connectionRequests.id, parseInt(id)));

      // Get both users' info for the response
      const fromUser = await db.select()
        .from(appUsers)
        .where(eq(appUsers.id, request[0].fromUserId))
        .limit(1);

      const toUser = await db.select()
        .from(appUsers)
        .where(eq(appUsers.id, request[0].toUserId))
        .limit(1);

      res.json({ 
        success: true,
        fromUser: fromUser[0],
        toUser: toUser[0]
      });
    } catch (error) {
      console.error("Error accepting connection request:", error);
      res.status(500).json({ error: "Failed to accept connection request" });
    }
  });

  // Reject connection request
  app.post("/api/connection-requests/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const request = await db.select()
        .from(connectionRequests)
        .where(eq(connectionRequests.id, parseInt(id)))
        .limit(1);

      if (request.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request[0].toUserId !== userId) {
        return res.status(403).json({ error: "Not authorized to reject this request" });
      }

      await db.update(connectionRequests)
        .set({ status: "rejected" })
        .where(eq(connectionRequests.id, parseInt(id)));

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting connection request:", error);
      res.status(500).json({ error: "Failed to reject connection request" });
    }
  });

  // Get accepted connections for a user (family members)
  app.get("/api/connections/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const connections = await db.select()
        .from(connectionRequests)
        .where(and(
          or(
            eq(connectionRequests.fromUserId, userId),
            eq(connectionRequests.toUserId, userId)
          ),
          eq(connectionRequests.status, "accepted")
        ));

      // Get user info for each connection
      const members = await Promise.all(connections.map(async (conn) => {
        const otherUserId = conn.fromUserId === userId ? conn.toUserId : conn.fromUserId;
        const user = await db.select()
          .from(appUsers)
          .where(eq(appUsers.id, otherUserId))
          .limit(1);
        
        if (user.length === 0) return null;
        
        return {
          id: conn.id.toString(),
          userId: user[0].id,
          name: user[0].name,
          role: user[0].role,
          avatarSvg: user[0].avatarSvg,
          connectedAt: conn.createdAt,
        };
      }));

      res.json(members.filter(Boolean));
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  app.delete("/api/connections/:connectionId", async (req, res) => {
    try {
      const { connectionId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const connection = await db.select()
        .from(connectionRequests)
        .where(eq(connectionRequests.id, parseInt(connectionId)))
        .limit(1);

      if (connection.length === 0) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const conn = connection[0];
      if (conn.fromUserId !== userId && conn.toUserId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this connection" });
      }

      await db.delete(connectionRequests)
        .where(eq(connectionRequests.id, parseInt(connectionId)));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  app.post("/api/device-tokens", async (req, res) => {
    try {
      const { userId, token, platform } = req.body;
      
      if (!userId || !token || !platform) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existingToken = await db.select()
        .from(deviceTokens)
        .where(eq(deviceTokens.token, token))
        .limit(1);

      if (existingToken.length > 0) {
        await db.update(deviceTokens)
          .set({ userId, platform, updatedAt: new Date() })
          .where(eq(deviceTokens.token, token));
      } else {
        await db.insert(deviceTokens).values({
          userId,
          token,
          platform,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error registering device token:", error);
      res.status(500).json({ error: "Failed to register device token" });
    }
  });

  app.delete("/api/device-tokens", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing device token:", error);
      res.status(500).json({ error: "Failed to remove device token" });
    }
  });

  app.post("/api/family-connections", async (req, res) => {
    try {
      const { parentId, childId, childName } = req.body;
      
      if (!parentId || !childId || !childName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existing = await db.select()
        .from(familyConnections)
        .where(and(
          eq(familyConnections.parentId, parentId),
          eq(familyConnections.childId, childId)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(familyConnections).values({
          parentId,
          childId,
          childName,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error creating family connection:", error);
      res.status(500).json({ error: "Failed to create family connection" });
    }
  });

  app.get("/api/family-connections/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      
      const connections = await db.select()
        .from(familyConnections)
        .where(eq(familyConnections.parentId, parentId));

      res.json(connections);
    } catch (error) {
      console.error("Error fetching family connections:", error);
      res.status(500).json({ error: "Failed to fetch family connections" });
    }
  });

  app.post("/api/notifications/send", async (req, res) => {
    try {
      const { parentId, title, body, data } = req.body;
      
      if (!parentId || !title || !body) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get connected family members (using connectionRequests with accepted status)
      const connections = await db.select()
        .from(connectionRequests)
        .where(and(
          or(
            eq(connectionRequests.fromUserId, parentId),
            eq(connectionRequests.toUserId, parentId)
          ),
          eq(connectionRequests.status, "accepted")
        ));

      if (connections.length === 0) {
        return res.json({ success: true, message: "No family members to notify" });
      }

      // Get all connected user IDs
      const connectedUserIds = connections.map(conn => 
        conn.fromUserId === parentId ? conn.toUserId : conn.fromUserId
      );

      let pushSent = 0;
      let pushFailed = 0;
      let wsSent = 0;
      let wsFailed = 0;

      // Send push notifications via AWS SNS
      const pushResult = await sendPushNotificationsToUsers(connectedUserIds, title, body, data);
      pushSent = pushResult.sent;
      pushFailed = pushResult.failed;

      // Send real-time updates via WebSocket
      const wsResult = wsManager.sendToUsers(connectedUserIds, {
        type: 'notification',
        title,
        body,
        data: data || {},
        timestamp: new Date().toISOString(),
      });
      wsSent = wsResult.sent;
      wsFailed = wsResult.failed;

      res.json({ 
        success: true, 
        pushNotifications: { sent: pushSent, failed: pushFailed },
        websocket: { sent: wsSent, failed: wsFailed },
        message: `Notifications sent via ${pushSent > 0 ? 'SNS' : ''} ${wsSent > 0 ? 'WebSocket' : ''}`
      });
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // Create a task
  app.post("/api/tasks", async (req, res) => {
    try {
      const { itemId, itemSvgData, itemName, quantity, note, assignedToId, assignedToName, assignedById, assignedByName } = req.body;
      
      if (!itemId || !itemSvgData || !assignedToId || !assignedToName || !assignedById || !assignedByName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [newTask] = await db.insert(tasks).values({
        itemId,
        itemSvgData,
        itemName: itemName || null,
        quantity: quantity || 1,
        note: note || null,
        assignedToId,
        assignedToName,
        assignedById,
        assignedByName,
        status: "pending",
      }).returning();

      // Send real-time notification to the assigned user via WebSocket
      wsManager.sendToUser(assignedToId, {
        type: 'new_task',
        task: newTask,
        message: `New task from ${assignedByName}: ${itemName || 'Task'}`,
        timestamp: new Date().toISOString(),
      });

      // Send push notification via AWS SNS
      await sendPushNotification(
        assignedToId,
        `New task from ${assignedByName}`,
        itemName || 'You have a new task',
        {
          taskId: newTask.id.toString(),
          type: 'new_task',
        }
      );

      res.json(newTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Get tasks for a user (assigned to them OR assigned by them)
  app.get("/api/tasks/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const userTasks = await db.select()
        .from(tasks)
        .where(or(
          eq(tasks.assignedToId, userId),
          eq(tasks.assignedById, userId)
        ));

      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Mark task as complete
  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the task first to notify the parent
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const [updatedTask] = await db.update(tasks)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(tasks.id, parseInt(id)))
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Notify the parent that the task was completed
      wsManager.sendToUser(updatedTask.assignedById, {
        type: 'task_completed',
        task: updatedTask,
        message: `${updatedTask.assignedToName} completed: ${updatedTask.itemName || 'Task'}`,
        timestamp: new Date().toISOString(),
      });

      // Send push notification to parent
      await sendPushNotification(
        updatedTask.assignedById,
        `Task completed by ${updatedTask.assignedToName}`,
        `${updatedTask.itemName || 'Task'} has been completed`,
        {
          taskId: updatedTask.id.toString(),
          type: 'task_completed',
        }
      );

      res.json(updatedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server
  wsManager.initialize(httpServer);

  return httpServer;
}
