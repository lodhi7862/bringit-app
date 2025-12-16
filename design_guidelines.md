# BringIt Mobile Application - Design Guidelines

## Architecture Decisions

### Authentication
**No Traditional Auth Required**
- App uses local-only identity system
- No email/password, no SSO, no cloud accounts
- User creates profile with:
  - Name (required)
  - Optional profile photo (camera/gallery)
  - Auto-generated local User ID and QR code
- Profile management accessible from main navigation

### Navigation Architecture
**Tab Navigation (4 Tabs + Floating Action Button)**
- **Saved Items** (catalog icon): Browse/manage reusable item library
- **Orders** (list icon): Active and pending orders
- **History** (clock icon): Completed orders
- **Family** (users icon): Connected family members and QR scanner
- **Floating Action Button** (center): "Create Order" (primary action)

All navigation is stack-based within tabs. No drawer needed.

### Screen Specifications

#### 1. Profile Setup (First Launch - Modal Stack)
**Purpose:** Create local user identity
- **Layout:**
  - Transparent header with "Skip" button (right)
  - Scrollable form with centered content
  - Profile photo picker (circular, 120px diameter)
  - Name input field
  - "Create Profile" button at bottom
  - Safe area: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl
- **Components:** Camera/gallery picker, text input, primary button
- **Flow:** After creation, show QR code modal with "Share this code with family" prompt

#### 2. Saved Items Tab (Default Screen)
**Purpose:** Browse and manage permanent item catalog
- **Layout:**
  - Default navigation header with "Saved Items" title
  - Search bar in header (collapsible on scroll)
  - Right header button: "Edit" mode toggle
  - Grid layout (2 columns) of item cards
  - Empty state: "No saved items yet. Add items when creating orders!"
  - Safe area: bottom = tabBarHeight + Spacing.xl, top = Spacing.xl
- **Components:**
  - Item card: SVG preview (square), optional name overlay, delete button (edit mode)
  - Pull-to-refresh
- **Interactions:**
  - Tap card: View item details modal (SVG, name, last note)
  - Long press: Quick delete with confirmation alert

#### 3. Create Order Screen (Modal)
**Purpose:** Compose new order for family member
- **Layout:**
  - Custom header: "New Order" title, "Cancel" (left), "Review" (right, disabled until 1+ item)
  - Sticky recipient selector at top: "Sending to: [Family Member Picker]"
  - Scrollable item list
  - Two action buttons (side-by-side):
    - "Add from Saved" (secondary style)
    - "Take Photo" (camera icon, primary style)
  - Safe area: bottom = insets.bottom + Spacing.xl, top = Spacing.xl
- **Components:**
  - Family member selector (dropdown or modal list)
  - Item row: SVG thumbnail (64px), quantity stepper, note input field, remove button
  - Empty state: Camera icon with "Add your first item"
- **Flow:**
  - "Take Photo" → Camera → SVG conversion → Auto-add to order and saved items
  - "Add from Saved" → Saved items picker modal → Add selected item
  - "Review" → Order summary modal → "Send Order" confirmation

#### 4. Orders Tab
**Purpose:** View active and pending orders (sent and received)
- **Layout:**
  - Default header with "Orders" title
  - Segmented control: "Received" | "Sent"
  - List of order cards grouped by status (Pending, In Progress)
  - Safe area: bottom = tabBarHeight + Spacing.xl, top = Spacing.xl
- **Components:**
  - Order card: Sender/receiver name, item count, timestamp, status badge, preview of first 3 item SVGs
  - Empty state: "No active orders"
- **Interactions:**
  - Tap order → Order detail screen

#### 5. Order Detail Screen (Received Order)
**Purpose:** Complete order items
- **Layout:**
  - Custom header: "[Sender Name]'s Order", "Back" (left)
  - Scrollable list of order items
  - Sticky footer: "Mark Order Complete" button (disabled until all items checked)
  - Safe area: bottom = insets.bottom + Spacing.xl, top = Spacing.xl
- **Components:**
  - Order item row:
    - SVG preview (80px square)
    - Item name (if exists)
    - Quantity and note text
    - Checkbox (right): "Found"
    - Expand button: Shows clarification note input and "Replace Photo" button
  - Status indicator at top: "3 of 5 items found"

#### 6. Order Detail Screen (Sent Order)
**Purpose:** Monitor order completion
- **Layout:** Same as received order but read-only
- Shows completion status per item with receiver's clarification notes
- No interactive elements except "Back"

#### 7. Family Tab
**Purpose:** Manage family connections
- **Layout:**
  - Default header: "Family Network"
  - Right header button: "Add Member" (QR or manual entry modal)
  - List of connected family members (avatar, name, connection date)
  - Profile section at top: "Your Profile" card showing QR code and local ID
  - Safe area: bottom = tabBarHeight + Spacing.xl, top = Spacing.xl
- **Components:**
  - Profile card: Circular avatar, name, "Show QR Code" button, "Edit Profile" button
  - Family member row: Avatar, name, swipe-to-delete
  - Empty state: "Connect with family to start sharing orders"
- **QR Scanner Modal:**
  - Full-screen camera view
  - Cancel button (top left)
  - Instructions overlay: "Scan family member's QR code"
  - On successful scan: "Accept connection from [Name]?" confirmation alert

#### 8. History Tab
**Purpose:** Review completed orders
- **Layout:**
  - Default header: "History"
  - Grouped list by date (Today, Yesterday, Last 7 Days, etc.)
  - Order cards (same design as Orders tab, grayed out)
  - Safe area: bottom = tabBarHeight + Spacing.xl, top = Spacing.xl
- **Interactions:**
  - Tap card → Read-only order detail
  - Swipe → Delete with confirmation

## Design System

### Color Palette
**Primary Colors:**
- Primary: #4A90E2 (trust, clarity)
- Primary Dark: #357ABD
- Secondary: #7B68EE (family-friendly purple)
- Accent: #50C878 (completion green)

**Neutral Colors:**
- Background: #FFFFFF
- Surface: #F8F9FA
- Border: #E1E4E8
- Text Primary: #1A1A1A
- Text Secondary: #6A737D
- Text Tertiary: #959DA5

**Status Colors:**
- Pending: #FFA726 (orange)
- In Progress: #42A5F5 (blue)
- Completed: #50C878 (green)
- Error: #EF5350 (red)

### Typography
**System Font** (San Francisco for iOS, Roboto for Android)
- **Heading 1:** 28px, Bold, 1.2 line height
- **Heading 2:** 22px, Semibold, 1.3 line height
- **Heading 3:** 18px, Semibold, 1.4 line height
- **Body:** 16px, Regular, 1.5 line height
- **Body Small:** 14px, Regular, 1.5 line height
- **Caption:** 12px, Regular, 1.4 line height

### Spacing System
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- xxl: 32px

### Component Specifications

#### Buttons
- **Primary Button:**
  - Background: Primary color
  - Text: White, Semibold, 16px
  - Height: 48px, Border radius: 12px
  - Press feedback: Opacity 0.8
- **Secondary Button:**
  - Background: Surface color, Border: 1px Border color
  - Text: Primary color, Semibold, 16px
  - Height: 48px, Border radius: 12px
  - Press feedback: Background → #E8E8E8
- **Floating Action Button:**
  - Size: 56px diameter, Border radius: 28px
  - Background: Primary color, Icon: White
  - Shadow: offset (0, 2), opacity 0.10, radius 2
  - Position: Bottom center, 16px above tab bar

#### Cards
- Background: White
- Border radius: 12px
- Border: 1px #E1E4E8
- Padding: 16px
- Press feedback: Scale 0.98

#### Input Fields
- Height: 48px
- Border: 1px #E1E4E8, Border radius: 8px
- Padding: 12px horizontal
- Focus state: Border color → Primary
- Placeholder: Text Tertiary

#### SVG Previews
- Always use rounded corners (8px border radius)
- Aspect ratio: 1:1 (square)
- Border: 1px #E1E4E8
- Loading state: Skeleton shimmer animation

### Visual Assets
**Required Generated Assets:**
1. **Default User Avatars (5 variations):** Friendly, colorful geometric patterns or illustrated characters that work for all ages. Style: Minimal, warm, family-friendly
2. **Empty State Illustrations (3):**
   - No saved items: Simple grocery bag illustration
   - No orders: Family coordination illustration
   - No family members: Connection/link illustration
3. **App Icon:** Shopping bag with family silhouette, gradient background (Primary → Secondary)

**Standard Icons:** Use Feather icons from @expo/vector-icons for all UI actions (camera, trash, check, edit, users, clock, list, etc.)

### Accessibility
- Minimum touch target: 44×44px
- Color contrast ratio: 4.5:1 for text, 3:1 for UI elements
- All interactive elements have visible focus states
- SVG images have alt text descriptions stored in item metadata
- VoiceOver/TalkBack labels for all buttons and inputs
- Camera permissions clearly explained in system alert

### Interaction Patterns
- **Pull-to-refresh:** Available on all list screens
- **Swipe actions:** Delete on family members and history items
- **Long press:** Quick actions on saved items
- **Haptic feedback:** Light impact on button taps, medium on success actions, heavy on errors
- **Loading states:** Skeleton screens for lists, spinners for actions
- **Confirmation alerts:** Required for delete actions and order completion
- **Toast notifications:** Success messages (2s duration, bottom position)