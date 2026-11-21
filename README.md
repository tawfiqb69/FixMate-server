# FixMate Server — RESTful API

**A secure and scalable backend for the FixMate repair service platform.**

FixMate Server is the backend API powering FixMate, a full-stack home appliance and device repair booking platform. Built with **Node.js, Express.js, and MongoDB**, it handles authentication, role-based authorization, service management, booking workflows, payment processing, and administrative operations.

The API integrates with Better Auth through JWKS-based JWT verification and Stripe for secure payment processing, including webhook-based payment confirmation and idempotency protection.

---

## 🌐 Live Deployment

| Platform | Link |
|---|---|
| **Live API** | [FixMate Server](https://fix-mate-server-psi.vercel.app) |
| **Live Application** | [FixMate Client](https://fix-mate-client-tawny.vercel.app) |
| **Client Repository** | [GitHub Repository](https://github.com/tawfiqb69/FixMate-client) |
| **Server Repository** | [GitHub Repository](https://github.com/tawfiqb69/FixMate-server) |

---

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT verification using Better Auth JWKS.
- Dedicated authentication middleware.
- Role-based access control for Customer, Technician, and Admin.
- Protected API endpoints.
- Resource ownership validation.

**Authentication middlewares:**
- `verifyToken`
- `verifyCustomer`
- `verifyTechnician`
- `verifyAdmin`

### 🛠️ Service Management
- Create, update, and delete repair services.
- Retrieve service details.
- Admin service approval workflow.
- Service availability management.
- ImgBB image upload integration.

### 🔍 Service Discovery
- Server-side search functionality.
- Category-based filtering.
- Service mode filtering.
- Sorting support.
- Efficient service data retrieval.

### 📅 Booking Management
- Create and manage repair bookings.
- Enforce valid booking status transitions on the server.
- Validate customer and technician ownership.
- Prevent unauthorized booking operations.
- Support booking cancellation and rejection.
- Retrieve role-specific booking information.

### 💳 Stripe Payment Integration
- Create Stripe Checkout sessions.
- Verify payment completion.
- Handle Stripe webhook events.
- Update booking payment information.
- Implement idempotency protection to prevent duplicate payment processing.
- Support post-completion payment workflow.

### 🛡️ Admin & Profile APIs
- Retrieve and manage user information.
- Update user roles.
- Access administrative booking data.
- Manage service approvals.
- Retrieve transaction records and revenue data.
- Handle user profile operations.

---

## 🔄 Booking & Payment Lifecycle

The backend enforces the booking workflow to ensure that only valid status transitions are allowed.

```text
requested
    │
    ├──► rejected
    │
    └──► accepted
             │
             ├──► cancelled
             │
             └──► in progress
                       │
                       └──► completed
                                  │
                                  ▼
                            Stripe Checkout
                                  │
                                  ▼
                         Payment Verification
                                  │
                                  ▼
                         Webhook Confirmation
                                  │
                                  ▼
                         Transaction Recorded
```

**Important:** Payment is available only after the repair job has been completed.

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| MongoDB | NoSQL database |
| Better Auth JWKS | JWT verification |
| jose | JWT and JWKS handling |
| Stripe | Payment processing |
| Multer | File upload handling |
| ImgBB | Image hosting |
| CORS | Cross-origin request handling |
| dotenv | Environment configuration |

---

## 🔐 Security & Reliability

- JWKS-based JWT verification.
- Role-based authorization middleware.
- Server-side ownership checks.
- Server-enforced booking status transitions.
- Protected administrative operations.
- Stripe webhook signature verification.
- Idempotent payment event processing.
- Environment-based secret management.
- Separation of authentication and authorization responsibilities.

---

## 📁 Project Structure

```text
fixmate-server/
│
├── index.js
├── routes/
├── controllers/
├── middleware/
├── models/
├── config/
├── utils/
│
├── .env.example
├── package.json
└── README.md
```

*Illustrative structure — update it to match the actual server repository.*

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB database
- Git
- Stripe account (for payment integration)

### 1. Clone the Repository

```bash
git clone YOUR_SERVER_REPOSITORY_URL
cd fixmate-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and configure the required variables.

Use `.env.example` as the reference for all required environment variables.

```env
# Database
MONGODB_URI=

# Authentication
BETTER_AUTH_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Image Hosting
IMGBB_API_KEY=

# Application
PORT=
CLIENT_URL=
```

> Variable names should match the actual `.env.example` file.

### 4. Start the Development Server

Using npm:

```bash
npm run dev
```

Or directly:

```bash
node index.js
```

The API will start on the configured port.

---

## 🔗 Frontend Integration

FixMate Server is designed to work with the FixMate Next.js frontend.

**Frontend:** [FixMate Client](https://fix-mate-client-tawny.vercel.app)

The client communicates with the backend through REST APIs for:

- Authentication and authorization.
- Service discovery and management.
- Repair booking operations.
- Booking status updates.
- Stripe Checkout sessions.
- Payment verification and confirmation.
- Administrative operations.

---

## 🧪 Testing

The backend can be tested using API testing tools such as:

- Postman
- Thunder Client

Important testing scenarios include:

- Valid and invalid JWT authentication.
- Role-based access restrictions.
- Booking ownership validation.
- Invalid booking status transitions.
- Duplicate booking protection.
- Stripe Checkout session creation.
- Webhook signature verification.
- Duplicate webhook event handling.

---

## 🎯 Backend Engineering Highlights

This project demonstrates practical backend development concepts:

- Designing RESTful APIs with Express.js.
- Implementing JWT authentication using JWKS.
- Building reusable role-based middleware.
- Enforcing business rules at the server level.
- Managing resource ownership and authorization.
- Integrating third-party payment services.
- Handling asynchronous Stripe webhook events.
- Implementing idempotent payment processing.
- Managing MongoDB-based application data.

---

## 👨‍💻 Developer

**SM Tawfiq**

Full-Stack Web Developer | CSE Student

- GitHub: [@tawfiqb69](https://github.com/tawfiqb69)
- Portfolio: [Visit Portfolio](YOUR_PORTFOLIO_URL)
- LinkedIn: [SM Tawfiq](https://www.linkedin.com/in/sm-tawfiq/)

---

<p align="center">
  <b>FixMate Server — Powering Reliable Repair Service Management.</b>
  <br />
  Built with ❤️ by SM Tawfiq
</p>