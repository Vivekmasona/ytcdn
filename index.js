import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

let browserPromise: Promise<any> | null = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  return browserPromise;
}

app.get("/yt", async (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing ?url=https://youtube.com/watch?v=..." });
  }

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    let playbackUrl: string | null = null;

    // Listen for network requests
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("googlevideo.com/videoplayback")) {
        playbackUrl = url;
      }
    });

    await page.goto(videoUrl, { waitUntil: "networkidle2" });

    // Wait a bit so requests are captured
    await page.waitForTimeout(5000);

    await page.close();

    if (playbackUrl) {
      return res.json({ playbackUrl });
    } else {
      return res.status(404).json({ error: "No googlevideo.com playback URL found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to extract video URL" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
