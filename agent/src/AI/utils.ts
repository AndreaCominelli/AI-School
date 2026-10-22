import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isAxiosError } from "axios";

export const readFile = async (
    filePath: string | undefined,
): Promise<string> => {
    if (!filePath) throw new Error("File path is undefined");

    let result: string = "";
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const coolPath = path.join(__dirname, filePath);
    const readStream = fs.createReadStream(coolPath);
    try {
        for await (const chunk of readStream) {
            result += chunk;
        }
        return result;
    } catch (error) {
        throw error;
    } finally {
        readStream.close();
    }
};

export const writeFile = async (
    filePath: string | undefined,
    line: string,
): Promise<void> => {
    if (!filePath) throw new Error("File path is undefined");

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const coolPath = path.join(__dirname, filePath);
    const writeStream = fs.createWriteStream(coolPath, { flags: "a" });
    writeStream.write(line, (error) => {
        console.log(error);
        writeStream.close();
    });
};

export const toErrorMessage = (err: unknown): string => {
    if (isAxiosError(err)) {
        const status = err.response?.status;
        const body = err.response?.data;
        const detail =
            body === undefined
                ? err.message
                : typeof body === "string"
                  ? body
                  : JSON.stringify(body);
        return `CMS request failed${status ? ` (HTTP ${status})` : ""}: ${detail}`.slice(
            0,
            2000,
        );
    }
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
};