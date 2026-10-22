# CMS Agent

An Express server that uses an LLM to map components into content types on a CMS (currently Contentstack) through a set of tools.

## Requirements

- Node.js **25.9.0**
- npm
- Docker (only if you want to run the app in a container)

The entry point is `src/index.ts`. TypeScript files are executed directly by Node (type stripping), so there is no build step.

## Install the dependencies

```bash
node -v        # should print v25.9.0
npm install
```

> Every package imported at runtime (express, axios, zod, dotenv, the Anthropic SDK, ...) must be listed under `dependencies` in `package.json`, **not** under `devDependencies`. The Docker image installs production dependencies only, so a package declared as a dev dependency will be missing inside the container (`ERR_MODULE_NOT_FOUND`).

## Configuration

Create a `.env` file in the root directory of the project with the following variables:

| Variable         | Required | Description                                                                                  |
| ---------------- | -------- | -------------------------------------------------------------------------------------------- |
| `PORT`           | No       | Port the server listens on. Default: `3000`.                                                 |
| `CMS`            | Yes      | CMS to use. For now, leave it set to `contentstack`.                                         |
| `CMS_API_KEY`    | Yes      | API key of the CMS stack.                                                                    |
| `CMS_MNG_TOKEN`  | Yes      | Management token for Contentstack.                                                           |
| `MODEL`          | No       | LLM to use. Default: `claude-haiku-5-5`.                                                     |
| `MODEL_KEY`      | Yes      | API key used by the LLM SDK.                                                                 |
| `MODEL_SRC_PATH` | Yes      | **Absolute** path to the folder that lists the components to map onto the CMS.               |

Example:

```env
PORT=3000
CMS=contentstack
CMS_API_KEY=your-cms-api-key
CMS_MNG_TOKEN=your-management-token
MODEL=claude-haiku-5-5
MODEL_KEY=your-model-api-key
MODEL_SRC_PATH=/absolute/path/to/components
```

> **Never commit the `.env` file.** It contains secrets. Make sure it is listed in `.gitignore` and `.dockerignore`.

## Run locally

```bash
npm start
# or
node src/index.ts
```

The server listens on the port set in `PORT` (default `3000`).

## Run with Docker

1. Make sure the `.env` file described above is in the root directory.
2. Build the image:

   ```bash
   docker build -t cms-agent .
   ```

3. Start the container:

   ```bash
   ./run-container.sh
   ```

   If the script is not executable, run `chmod +x run-container.sh` first.

If you use a different `PORT` in `.env`, make sure the port published by the container matches it.

## Modifying the application

1. Edit the source files in `src/`.
2. Add new cms implementations by extending AbstractCms.ts abstract class under `src/AI/cms`.
3. Add in the `src/AI/knowledge` directory all the files needed by the model to understand how to map a component to be compatible with the chosen cms technology.
4. Test the change locally with `npm start`.
5. If you added a new package, install it **without** the `-D` flag if it is needed at runtime (`npm install <package>`).
6. Rebuild the image to include your changes:

   ```bash
   docker build -t cms-agent .
   ./run-container.sh
   ```

   If something looks stale after changing dependencies, rebuild without the layer cache: `docker build --no-cache -t cms-agent .`

To reproduce what happens inside the container (production dependencies only) before building the image:

```bash
rm -rf node_modules && NODE_ENV=production npm ci --omit=dev && node src/index.ts
```

## Troubleshooting

- **`ERR_MODULE_NOT_FOUND` inside the container only:** a runtime package is declared as a dev dependency or is missing from `package.json`. Move it to `dependencies`.
- **The server is unreachable from outside the container:** check that the published port matches `PORT`, and that the server is not bound to `127.0.0.1` only.
- **Variables are `undefined`:** check that the `.env` file is in the root directory and that the variable names match exactly the ones listed above.