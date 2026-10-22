import "dotenv/config";
import express, { type Express, type Request, type Response } from 'express';
import AgentService from "./services/agentService.ts";

const app: Express = express();
const service: AgentService = AgentService.buildService(process.env.CMS);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/", async (req: Request, res: Response) => {
    const body = req.body;
    const modelResponse = await service.callModel(body.message);
    let response: string = "";

    for (const block of modelResponse.content) {
        if (block.type === 'text') {
          response += block.text;
        }
    }

    res.send(response);
});

app.listen(process.env.PORT || 3000);