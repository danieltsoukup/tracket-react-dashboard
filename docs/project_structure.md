# Project Structure

## Current Structure

```text
tracket-react-dashboard/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .oxlintrc.json
├── .gitignore
├── README.md
├── LICENSE
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── assets/
│       └── hero.png
└── docs/
	├── high_level_design.md
	└── project_structure.md
```

The `node_modules/` and `dist/` directories are generated locally and are not committed to Git.

## Application Files

### `index.html`

The browser entry document. It provides the `root` element where React mounts and loads `src/main.tsx`.

### `src/main.tsx`

The React entrypoint. It enables `StrictMode`, finds the `root` element, and renders the `App` component.

### `src/App.tsx`

The current application shell. It renders the Tracket header and the placeholder `LocationsPage`. This is where the application routes and top-level layout will be introduced.

### `src/index.css`

Global and page-level styles for the current placeholder, including typography, colors, header layout, spacing, and responsive behavior.

### `src/assets/`

Assets imported by React components.

## Static Files

### `public/`

Files in this directory are copied directly into the production build and can be referenced from the site root.

- `favicon.svg`: browser tab icon.
- `icons.svg`: shared SVG icon definitions.

## Configuration

### `package.json`

Defines project metadata, npm scripts, and dependencies.

```bash
npm run dev       # Start the Vite development server
npm run build     # Type-check and create dist/
npm run lint      # Run Oxlint
npm run preview   # Preview the production build
```

### `package-lock.json`

Locks exact npm dependency versions so installs are reproducible locally and in Docker.

### `vite.config.ts`

Configures Vite and enables the React plugin. Vite provides the development server, hot module replacement, and production bundling.

### `tsconfig.json`

The root TypeScript configuration. It references the application and Node/Vite-specific configurations.

### `tsconfig.app.json`

TypeScript settings for files under `src/`, including JSX, browser APIs, bundler module resolution, and unused-code checks.

### `tsconfig.node.json`

TypeScript settings for Node-side configuration files such as `vite.config.ts`.

### `.oxlintrc.json`

Configures Oxlint with React, TypeScript, and JavaScript rules.

### `.gitignore`

Lists generated files and local-only files that Git should not track, including `node_modules/`, `dist/`, logs, and editor settings.

## Documentation

### `docs/high_level_design.md`

Describes the intended dashboard features, public API endpoints, routes, and planned technology stack.

### `docs/project_structure.md`

Documents the purpose of the repository files and the planned application organization.

### `README.md`

Currently contains the default Vite setup notes. It should eventually be replaced with project-specific development, testing, and deployment instructions.

### `LICENSE`

Contains the project's license terms.
