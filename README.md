# 🎓 KUG Oriental Academy - Result & Certificate Portal

A professional, full-featured web application for managing student examination results and generating certificates for KUG Oriental Academy. Built with modern technologies and best practices for optimal performance and user experience.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development](#development)
  - [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Authentication](#authentication)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

The KUG Oriental Academy Result & Certificate Portal is a modern, responsive web application designed to streamline the process of result publication and certificate generation for academic institutions. Students can search for their results using their registration number, while administrators can manage and generate bulk certificates efficiently.

### Live Demo

🔗 [kugoriental.com](https://kugoriental.com)

## ✨ Features

### For Students
- 🔍 **Quick Result Search** - Search examination results by registration number
- 📄 **PDF Generation** - Download official certificates as high-quality PDFs
- 🖨️ **Print Optimization** - Print-ready certificate layouts
- 📱 **Responsive Design** - Seamless experience across all devices
- 🌓 **Theme Toggle** - Switch between light and dark modes
- ⏰ **Scheduled Release** - Time-gated result availability system

### For Administrators
- 🔐 **Secure Authentication** - Protected admin routes and features
- 📊 **Bulk Certificate Generation** - Generate certificates for multiple students
- 👥 **Student Management** - Manage PDA and DCP course students
- 🎨 **Certificate Preview** - Live preview before generating
- 📸 **Photo Integration** - Automatic student photo embedding

### Technical Features
- ⚡ **Lightning Fast** - Built with Vite for optimal performance
- 🎯 **Type Safe** - Full TypeScript implementation
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- ♿ **Accessible** - ARIA labels and semantic HTML
- 🔄 **State Management** - React Query for server state
- 📱 **Progressive** - Mobile-first responsive design
- 🎭 **Animations** - Smooth transitions and loading states

## 🛠️ Tech Stack

### Core Technologies
- **React 18.3.1** - UI library
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **React Router DOM 6.30.1** - Client-side routing

### UI Framework & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Beautiful icon library
- **next-themes** - Theme management

### Forms & Validation
- **React Hook Form 7.61.1** - Performant form handling
- **Zod 3.25.76** - Schema validation
- **@hookform/resolvers** - Form validation resolvers

### Document Generation
- **html2canvas 1.4.1** - HTML to canvas conversion
- **jsPDF 3.0.2** - PDF generation library

### State Management
- **TanStack Query 5.83.0** - Server state management
- **React Context API** - Authentication state

### Development Tools
- **ESLint 9.32.0** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **yarn** (v1.22.0 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/oriental.git
   cd oriental
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables** (if needed)
   ```bash
   cp .env.example .env
   ```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### Building for Production

1. **Create an optimized production build**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Preview the production build locally**
   ```bash
   npm run preview
   # or
   yarn preview
   ```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
# or
yarn lint
```

## 📁 Project Structure

```
oriental/
├── public/                          # Static assets
│   ├── DCP STUDENTS PHOTOS/        # Student photographs
│   ├── WORK SHOP CERTIFICATE/      # Workshop certificate templates
│   ├── Course Certificate Model*   # Certificate templates
│   ├── kug seal.png               # Official seal
│   └── letterhead.jpg             # Letterhead template
├── src/
│   ├── components/                 # React components
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── BulkCertificateDialog.tsx
│   │   ├── Certificate.tsx        # Certificate component
│   │   ├── ErrorMessage.tsx       # Error handling
│   │   ├── PrintPDFButtons.tsx    # PDF generation
│   │   ├── ProtectedRoute.tsx     # Route protection
│   │   ├── ResultTable.tsx        # Result display
│   │   ├── SearchBox.tsx          # Search functionality
│   │   └── ThemeToggle.tsx        # Theme switcher
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── data/
│   │   └── studentsData.ts        # Student data (PDA & DCP)
│   ├── hooks/
│   │   ├── use-mobile.tsx         # Mobile detection
│   │   ├── use-responsive.tsx     # Responsive utilities
│   │   └── use-toast.ts           # Toast notifications
│   ├── lib/
│   │   └── utils.ts               # Utility functions
│   ├── pages/
│   │   ├── Index.tsx              # Main page
│   │   ├── Login.tsx              # Login page
│   │   └── NotFound.tsx           # 404 page
│   ├── App.tsx                    # App component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── dist/                          # Production build
├── components.json                # shadcn/ui config
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite configuration
└── package.json                  # Dependencies
```

## 🔑 Key Components

### Certificate Component
Renders professional certificates with student information, course details, and institutional branding. Supports both PDA and DCP course formats.

**Location:** `src/components/Certificate.tsx`

### Search Box
Provides an intuitive interface for students to search their results by registration number with real-time validation.

**Location:** `src/components/SearchBox.tsx`

### Result Table
Displays comprehensive student result information in a clean, organized format with responsive design.

**Location:** `src/components/ResultTable.tsx`

### Bulk Certificate Dialog
Admin-only component for generating multiple certificates at once with filtering and bulk download capabilities.

**Location:** `src/components/BulkCertificateDialog.tsx`

### Protected Route
Higher-order component that restricts access to authenticated users only.

**Location:** `src/components/ProtectedRoute.tsx`

## 🔐 Authentication

The application uses a context-based authentication system:

- **Login Credentials**: Configured in `src/contexts/AuthContext.tsx`
- **Protected Routes**: Wrapped with `ProtectedRoute` component
- **Session Management**: Uses localStorage for persistence
- **Admin Features**: Certificate preview and bulk generation

**Default Admin Access:**
- Email: `admin@kugoriental.com`
- Password: `admin123` (Change in production!)

> ⚠️ **Security Note**: Update default credentials before deploying to production.

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Application
VITE_APP_TITLE=KUG Oriental Academy
VITE_APP_URL=https://kugoriental.com

# API (if backend integration needed)
# VITE_API_URL=https://api.kugoriental.com
```

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Netlify

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to Netlify

### GitHub Pages

1. Install `gh-pages`:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain component modularity
- Write descriptive commit messages
- Add comments for complex logic
- Ensure responsive design
- Test across multiple browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

**KUG Oriental Academy Development Team**

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Radix UI](https://www.radix-ui.com/) - Primitive components
- [Lucide Icons](https://lucide.dev/) - Icon library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Vite](https://vitejs.dev/) - Build tool

## 📞 Support

For technical support or queries:
- **Website**: [kugoriental.com](https://kugoriental.com)
- **Email**: contact@kugoriental.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/oriental/issues)

---

<div align="center">
  <p>Built with ❤️ by KUG Oriental Academy</p>
  <p>© 2025 KUG Oriental Academy. All rights reserved.</p>
</div>

