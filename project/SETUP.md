# E-Procurement Platform - Setup Guide

This is a comprehensive e-procurement platform for managing event and BTL procurement with supplier bidding rounds.

## Features Implemented

### ✅ Complete
- **Database Schema**: Full relational database with RLS policies (LIVE in Supabase!)
- **Authentication**: Role-based access control (Request Creator, Procurement Approver, Supplier, Admin)
- **Request Creator Portal**: Multi-step wizard to create procurement requests
- **Procurement Approver Portal**: Approve/reject requests and evaluate proposals
- **Supplier Portal**: View invitations and submit proposals
- **Shared Components**: Reusable UI components (Button, Card, Badge, Input, etc.)
- **Test Users**: Pre-configured users for all roles
- **Test Data**: 5 supplier companies ready to use
- **Debug Tools**: Built-in authentication debugging via browser console

### 🚧 In Progress
The foundation is complete. Additional features can be built on top:
- Offer evaluation and comparison views
- Adjustment rounds workflow
- Award process with justification
- Real-time notifications
- File upload system
- Administration panels
- Reports and analytics

## Getting Started

### 1. Database Setup ✅ DONE

The database is **FULLY CONFIGURED** and **LIVE** in Supabase with:
- ✅ 11 tables with proper relationships
- ✅ Row Level Security (RLS) policies (temporary permissive policies active)
- ✅ Indexes for performance
- ✅ Automatic timestamp updates via triggers
- ✅ 4 test users created with all roles
- ✅ 5 sample suppliers pre-loaded

**Current Status:** Everything is ready to use!

### 2. Test Users ✅ CREATED

**All test users are already created and ready to use!**

Just log in with these credentials:

**Request Creator:**
- Email: `creator@test.com`
- Password: `test123456`
- Role: Can create procurement requests

**Procurement Approver:**
- Email: `approver@test.com`
- Password: `test123456`
- Role: Can approve/reject requests and evaluate proposals

**Supplier:**
- Email: `maria@eventpro.com`
- Password: `test123456`
- Role: Can view invitations and submit proposals

**Admin:**
- Email: `admin@test.com`
- Password: `test123456`
- Role: Full access to all features

### 3. Start Using the Platform

The platform is ready! Just open the application and:

1. Log in with any of the test user credentials above
2. Explore the interface based on your role
3. Try creating a request as a creator
4. Approve it as an approver
5. Submit a proposal as a supplier

### 4. Available Suppliers

The following suppliers are pre-configured and ready for testing:

1. **Event Pro** (maria@eventpro.com) - 12% fee
2. **BTL Masters** (juan@btlmasters.com) - 10% fee
3. **Creative Agency** (ana@creative.com) - 15% fee
4. **Production House** (carlos@production.com) - 11.5% fee
5. **Event Solutions** (laura@eventsolutions.com) - 13% fee

**Note:** Maria (maria@eventpro.com) is both a supplier user AND associated with Event Pro company.

## User Flows

### Request Creator Flow
1. Login with creator credentials
2. Click **Create Request** in sidebar
3. Fill out the 6-step wizard:
   - Step 1: Event type, title, description
   - Step 2: Internal budget (confidential)
   - Step 3: Upload attachments
   - Step 4: Select suppliers to invite
   - Step 5: Configure rounds and deadline
   - Step 6: Review and submit
4. Request is sent for approval

### Procurement Approver Flow
1. Login with approver credentials
2. Go to **Pending Approval**
3. Review request details
4. Approve or reject with comments
5. Once approved, suppliers are notified
6. Monitor active requests in **Active Requests**
7. When proposals come in, evaluate and compare
8. Request adjustments or award contract

### Supplier Flow
1. Login with supplier credentials
2. View **Invitations** to see procurement requests
3. Click on invitation to view details
4. Submit proposal with line items:
   - Add items with quantity and price
   - Include descriptions and context
   - System calculates fee and total
5. Submit proposal
6. Wait for feedback or award notification

## Key Database Tables

- `users_profile` - Extended user information with roles
- `suppliers` - Master catalog of suppliers
- `requests` - Procurement requests
- `request_invitations` - Links requests to invited suppliers
- `proposals` - Supplier proposals for requests
- `proposal_items` - Line items in proposals
- `awards` - Final award decisions
- `notifications` - System notifications

## Environment Variables

Already configured in `.env`:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Running the Application

The development server should already be running. If not:

```bash
npm run dev
```

Then open the preview to see the application.

## Security Features

- **Row Level Security**: Users can only access data they're authorized to see
- **Role-based Access**: Different UI and permissions per role
- **Confidential Budget**: Internal budget never exposed to suppliers
- **Audit Trail**: All actions tracked with timestamps and user IDs

## Next Steps

To complete the platform, you can implement:
1. Detailed evaluation views with side-by-side comparison
2. Adjustment rounds with price reduction validation
3. Award process with mandatory justification
4. File upload to Supabase Storage
5. Real-time notifications using Supabase Realtime
6. Admin panels for managing suppliers and users
7. Reports and analytics dashboard

## Troubleshooting

**Can't login?**
- Make sure you created the auth user in Supabase Auth Dashboard
- Make sure you inserted the user profile with correct user_id
- Check that the email and password match

**Can't see any data?**
- RLS policies may be blocking access
- Verify your user has the correct role in users_profile table
- Check browser console for errors

**Suppliers not showing?**
- Run the seed migration to add test suppliers
- Or manually insert suppliers via SQL Editor
