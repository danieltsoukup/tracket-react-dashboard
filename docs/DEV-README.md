# Developer Notes

## Run Locally & Build

Test locally:

```
npm run dev
```

Test, lint and buils:

```
npm run test
npm run lint
npm run build
```

## Deploy to Vercel

Install the CLI:

```
npm i -g vercel
```

Login:

```
vercel login
```

Deploy a preview:

```
vercel
```

Note: ensure your git email matches your GitHub account otherwise vercel will block the deployment.

Deploy to prod:

```
vercel deploy --prod
```

## Stadia Layers

If running in Github Codespaces, set up you local env file following the example and provide the Stadia API key. These keys are guarded for local dev only and not included in the client-side code.