/** 
 * DEPENDENCIES 
 */

const Express = require("express");
const bodyParser = require('body-parser');

/**
 * CONSTANTS
 */

const app = Express();
const router = Express.Router();
const port = 8023;

/**
 * REQUEST HANDLERS
 */

// parse request bodies
app.use(bodyParser);

// route prefix
app.use("/sitecore-dxg", router);

// url: <domain>:8023/sitecore-dxg/status
router.get("/status", (request, response) => {
    response.json({ message: "Online" });
});

// url: <domain>:8023/sitecore-dxg/generate/mdj
router.get("/generate/mdj", (request, response) => {
    response.json({ message: "Metadata-json file generation has not yet been implemented" });
});

// url: <domain>:8023/sitecore-dxg/generate/mdj
router.get("/generate/documentation", (request, response) => {
    response.json({ message: "HTML Documentation generation has not yet implemented" });
});

// start listening
app.listen(port, () => console.log(`Sitecore DXG Service Started. Listening on port ${port}`));