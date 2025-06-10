const speech = require("@google-cloud/speech").v1p1beta1;
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const tmp = require("tmp");
const fs = require("fs");

const client = new speech.SpeechClient();

exports.transcribeVideoFromUrl = async (req, res) => {
  // Enable CORS for all origins
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Preflight request
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { videoUrl } = req.body;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing videoUrl" });
  }

  const videoFile = tmp.tmpNameSync({ postfix: ".mp4" });
  const audioFile = tmp.tmpNameSync({ postfix: ".flac" });

  try {
    // Download video
    const response = await axios({ url: videoUrl, responseType: "stream" });
    const writer = fs.createWriteStream(videoFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) =>
      writer.on("finish", resolve).on("error", reject)
    );

    // Extract audio as FLAC
    await new Promise((resolve, reject) => {
      ffmpeg(videoFile)
        .noVideo()
        .audioCodec("flac")
        .save(audioFile)
        .on("end", resolve)
        .on("error", reject);
    });

    const file = fs.readFileSync(audioFile);
    const audioBytes = file.toString("base64");

    const [operation] = await client.longRunningRecognize({
      audio: { content: audioBytes },
      config: {
        encoding: "FLAC",
        sampleRateHertz: 44100,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
      },
    });

    const [responseTranscription] = await operation.promise();
    const transcript = responseTranscription.results
      .map((r) => r.alternatives[0].transcript)
      .join(" ");

    res.status(200).json({ transcript });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Failed to transcribe video" });
  } finally {
    [videoFile, audioFile].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
  }
};
