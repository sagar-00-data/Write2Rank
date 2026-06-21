const vision = require('@google-cloud/vision');
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'd:/AI Answer Checker/google-credentials.json.json';

async function test() {
  try {
    const client = new vision.ImageAnnotatorClient();
    console.log("Client created");
    const [result] = await client.documentTextDetection({
      image: { content: Buffer.from('fake image data') }
    });
    console.log(result);
  } catch (e) {
    console.error("ERROR TYPE:", typeof e);
    console.error("ERROR CONSTRUCTOR:", e.constructor.name);
    console.error("ERROR MESSAGE:", e.message);
    console.error("ERROR DETAILS:", e.details);
    console.error("FULL ERROR:", e);
  }
}
test();
