# 📄 PDFCraft

> **A powerful, private, client-side PDF editor built for the modern web.**
> Edit text, fill & sign forms, whiteout sensitive data, draw shapes, and annotate PDFs with 100% in-browser processing. No files are ever sent to a remote server.

---

## ✨ Features

- 🔒 **100% Private & Client-Side**: All document parsing, rendering, editing, and compilation happen entirely in your browser using WebAssembly and PDF.js. Your sensitive documents never leave your machine.
- 🔑 **Password-Protected & Aadhaar PDF Support**: Automatically detects encrypted documents and unlocks them on-the-fly with live password prompt support.
- ✍️ **Comprehensive Editing Tools**:
  - **Text Tool**: Add new text or click to edit existing PDF text with custom fonts, sizes, and colors.
  - **Digital Signatures**: Type cursive handwriting signatures, draw freehand with smoothing, or upload signature images.
  - **Whiteout / Redaction**: Block out and conceal sensitive text and graphics cleanly.
  - **Annotations**: Highlight, strikeout, underline, and freehand pencil drawing.
  - **Shapes**: Add rectangles, ellipses, lines, and directional arrows with custom strokes and fills.
  - **Interactive Form Fields**: Add text fields, textareas, checkboxes, radio buttons, and dropdown lists.
  - **Images & Hyperlinks**: Insert local images or create clickable hyperlinks.
- 👁️ **Live Document Export Preview**: Review changes across rendered canvas pages before triggering download.
- 📑 **Page Management**: Reorder, rotate 90°, delete, or insert blank pages with a built-in page thumbnail drawer.
- 🎨 **Modern Design System**: Built with Poppins & Inter typography, frosted glassmorphism docks, and a luxury Crimson Velvet & Rose Gold palette.

---

## 🛠️ Tech Stack

- **Framework & Bundler**: [Vite](https://vitejs.dev/)
- **PDF Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`)
- **PDF Compilation**: [pdf-lib](https://pdf-lib.js.org/)
- **Styling**: Vanilla CSS (CSS Custom Properties, Glassmorphism, Responsive Flex & Grid)
- **Typography**: [Poppins](https://fonts.google.com/specimen/Poppins) & [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- **Icons**: [Font Awesome 6](https://fontawesome.com/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `yarn`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anujcodess1/pdf-craft.git
   cd pdf-craft
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

4. **Build for production**:
   ```bash
   npm run build
   ```
   The compiled bundle will be generated in the `dist/` directory.

---

## 🌐 Deploying to Render

You can host PDFCraft for free on [Render](https://render.com/) as a **Static Site** in less than a minute:

### Option 1: Automatic Blueprint (Recommended)
This repository includes a [`render.yaml`](render.yaml) file configured with SPA routing and security headers.
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
2. Connect your GitHub repository: `https://github.com/anujcodess1/pdf-craft.git`.
3. Click **Apply** — Render will automatically build and publish your site!

### Option 2: Manual Static Site Setup
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **Static Site**.
2. Connect `https://github.com/anujcodess1/pdf-craft.git`.
3. Fill in the deployment settings:
   - **Name**: `pdfcraft` (or your choice)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Advanced** -> **Redirects / Rewrites**, add:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
5. Click **Create Static Site**.

## 📁 Project Structure

```text
├── index.html                  # Main application structure & Google Fonts
├── package.json                # Project dependencies and npm scripts
├── vite.config.js              # Vite bundler configuration
└── src/
    ├── css/
    │   ├── sejda-theme.css     # Global design tokens, typography, and header
    │   ├── editor.css          # Workspace, dropzone, page canvas, and preview
    │   ├── toolbars.css        # Floating left dock, context menu, and dropdowns
    │   └── modals.css          # Signatures, password prompts, and thumbnail drawer
    └── js/
        ├── app.js              # Application orchestrator & router
        ├── editor-state.js     # Reactive document state store & undo stack
        ├── pdf-engine.js       # PDF.js page renderer & text layer builder
        ├── pdf-exporter.js     # pdf-lib compiler (exports modified PDF)
        ├── sample-doc.js       # Built-in sample PDF generator for instant testing
        ├── tools/              # Annotation tools & interaction managers
        └── ui/                 # Modals, thumbnail drawer, context menus & toasts
```

---

## 🛡️ Privacy & Security

PDFCraft runs entirely inside your browser. Neither your original PDFs nor your edited documents are uploaded or saved to any external servers, making it completely compliant for handling sensitive agreements, identity cards, and personal records.

---

## 📄 License

This project is licensed under the ISC License.
