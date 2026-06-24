# Kingston Happenings Codebase Audit Results

This document consolidates the findings of our comprehensive codebase audit. It details security, synchronization, performance, date/timezone, and UI/UX/A11y bugs, categorizing them by severity.

---

## Critical & High Severity Issues

### 1. Admin Privilege Escalation on Signup
* **Category**: Security & Authorization
* **File & Lines**: [supabase-setup.sql:L81-L100](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/supabase-setup.sql#L81-L100)
* **Description**: The database trigger function `handle_new_user()` reads the user role directly from `NEW.raw_user_meta_data->>'role'`. Since Supabase client-side signups allow users to supply arbitrary fields inside `options.data`, a malicious user can call signup with `role: "admin"` directly in their payload, registering themselves as an administrator.
* **Recommendation**: Modify the database trigger to default the role strictly to `'user'` (or only allow `'organizer'` if self-registration for organizers is verified). Admin roles should only be assigned by a direct SQL update or via a secure admin console endpoint.

### 2. Anonymous/Unauthenticated Venue Creation
* **Category**: Security & Authorization
* **File & Lines**: [route.ts:L58-L86](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/api/venues/route.ts#L58-L86)
* **Description**: The `POST /api/venues` endpoint calls `getCurrentUser()` but never verifies if the user is authenticated. It sets the status to `'pending'` for anonymous requests and creates the venue. This allows anyone to flood the database with spam venues.
* **Recommendation**: Add a check to return `401 Unauthorized` if the user is not logged in:
  ```typescript
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  ```

### 3. User Profile Update Sync Loop (Name Remains Stale)
* **Category**: State & Database Sync
* **File & Lines**: 
  * API Update: [update/route.ts:L17-L23](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/api/user/update/route.ts#L17-L23)
  * Auth Helper: [auth.ts:L41](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/lib/auth.ts#L41)
* **Description**: When a user changes their name, `PUT /api/user/update` calls `supabase.auth.updateUser` to modify metadata but never updates the `profiles` table. Since `getCurrentUser()` prioritizes the `profiles.name` field over user metadata, the old name continues to load. The update fails silently in the UI after reload.
* **Recommendation**: Update the `profiles` database table explicitly in `/api/user/update/route.ts` or add an `AFTER UPDATE ON auth.users` trigger in PostgreSQL to keep profiles in sync.

### 4. Venue Deletion Foreign Key Restrict Crash (500 Error)
* **Category**: State & Database Sync
* **File & Lines**: [schema.prisma:L59](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/prisma/schema.prisma#L59) and [route.ts:L163](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/api/venues/%5Bid%5D/route.ts#L163)
* **Description**: The database schema configures the foreign key relation between `Event` and `Venue` as `ON DELETE RESTRICT`. Trying to delete or reject a venue that has associated events results in a foreign key constraint violation, crashing the API route and returning a `500 Internal Server Error`.
* **Recommendation**: If events should be deleted when their venue is deleted, update `prisma/schema.prisma` to use `onDelete: Cascade`. Otherwise, check for existing events in the API and return a friendly `400 Bad Request` message.

### 5. Display Date Timezone Shift (Off-by-One Date Bug)
* **Category**: Timezone, Dates, & Edge-Cases
* **File & Lines**: [page.tsx:L190](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/venues/[id]/page.tsx#L190)
* **Description**: The venue page instantiates event dates using `new Date(event.date)`. Since `event.date` is a `YYYY-MM-DD` string, JS parses it as UTC midnight. When formatted in a negative timezone offset (e.g. Kingston, Ontario at UTC-4/5), the date shifts back by one day, displaying the wrong date to users.
* **Recommendation**: Use `parseISO(event.date)` from `date-fns` to preserve local date parsing.

### 6. Timezone Shift in Client-Side Recurring Specials Calculation
* **Category**: Timezone, Dates, & Edge-Cases
* **File & Lines**: [page.tsx:L407-417](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/submit/page.tsx#L407-L417)
* **Description**: When computing weekly specials, the submit form parses the date using `new Date(form.date)` (UTC midnight). `getDay()` on this date evaluates to the previous day of the week in local Eastern time. The math offsets are broken, and final serialization back to UTC shifts the saved day forward by +1 day (saving Wednesday specials on Thursdays).
* **Recommendation**: Avoid `new Date()`. Parse string parts locally, evaluate day indexes using local date math, and serialize using `format(date, 'yyyy-MM-dd')`.

### 7. Lack of Pagination on Event and Venue GET Endpoints
* **Category**: Data Transfer & Performance
* **File & Lines**: 
  * Events API: [events/route.ts:L50-L63](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/api/events/route.ts#L50-L63)
  * Venues API: [venues/route.ts:L22-L30](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/api/venues/route.ts#L22-L30)
* **Description**: Both endpoints fetch all rows at once. As the website data grows, these queries will become slower, return massive JSON payloads, and degrade performance.
* **Recommendation**: Add limit and offset query parameters (`limit`/`take`, `page`/`skip`) to API routes and implement infinite scrolling or pagination on the client feed.

### 8. Redundant Global Like Aggregation Query
* **Category**: Data Transfer & Performance
* **File & Lines**: [likes/route.ts:L11-L19](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/api/likes/route.ts#L11-L19)
* **Description**: `GET /api/likes` runs a global `groupBy` aggregation over the entire `Like` table on every client reload, even though `likeCount` is already computed per event. This query does not scale.
* **Recommendation**: Change the endpoint to only return user-specific liked event IDs, and rely on the query count loaded inside event APIs for totals.

### 9. Unthrottled Tab Focus Refetch Loop
* **Category**: Data Transfer & Performance
* **File & Lines**: [EventsContext.tsx:L173-L189](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/contexts/EventsContext.tsx#L173-L189)
* **Description**: The visibility handler hits the database in parallel for events, venues, and likes every time the user refocuses or switches tabs. Lacking throttling, this causes unnecessary resource consumption.
* **Recommendation**: Throttle focus fetches to run only if at least 60 seconds have elapsed since the last refresh.

### 10. Venue Selector Input Freeze in Edit Mode
* **Category**: UI/UX & Compatibility
* **File & Lines**: [edit/page.tsx:L358-368](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/events/%5Bid%5D/edit/page.tsx#L358-L368)
* **Description**: In edit page, `VenueSelector` is passed hardcoded values (`newVenueName=""`, `newVenueAddress=""`) and dummy functions (`() => {}`). If an editor tries to type a new venue name, the inputs are completely frozen.
* **Recommendation**: Declare proper React state fields for these fields in `edit/page.tsx` and bind them to the selectors.

### 11. Nested Interactive Elements in EventCard
* **Category**: UI/UX & Compatibility
* **File & Lines**: [EventCard.tsx:L191-273](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/components/events/EventCard.tsx#L191-L273)
* **Description**: The entire `EventCard` is wrapped in a `<Link>` tag but contains a child `<button>` for the Like action. This produces invalid HTML and breaks tab navigation and keyboard activation.
* **Recommendation**: Pull the Like button outside the link wrapper structurally. Position the card link using absolute CSS overlays (`after:absolute after:inset-0`) so the card is clickable while sibling actions remain accessible.

### 12. Complete Lack of Keyboard Nav/ARIA in UI Widgets
* **Category**: Accessibility (a11y)
* **File & Lines**: 
  * File Dropzone: [submit/page.tsx:L1117-1139](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/app/submit/page.tsx#L1117-L1139)
  * Autocomplete: [VenueSelector.tsx:L111-197](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/components/venues/VenueSelector.tsx#L111-L197)
  * Modal dialog: [Modal.tsx:L72-137](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/components/ui/Modal.tsx#L72-L137)
  * Date Picker: [DatePicker.tsx:L92-208](file:///Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2/src/components/ui/DatePicker.tsx#L92-L208)
* **Description**:
  * The dropzone is a `div` with no `tabIndex` or keyboard handler (un-focusable).
  * Autocomplete options cannot be scrolled via arrows or selected via enter, and the list doesn't close on blur.
  * Modals do not trap focus, allowing focus to escape to background layers, and close buttons lack `aria-label`s.
  * The DatePicker uses a `readOnly` input, has no arrow navigation, and day numbers lack month/year labels for screen readers.
* **Recommendation**: Update widgets to trap focus correctly, listen for keyboard interactions (arrows/escape/enter), and define proper ARIA roles and labels.
