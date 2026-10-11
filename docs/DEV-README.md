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

Deploy to prod:

```
vercel
```

## Stadia Layers

If running in Github Codespaces, set up you local env file following the example and provide the Stadia API key. These keys are guarded for local dev only and not included in the client-side code.