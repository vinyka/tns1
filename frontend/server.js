const express = require("express");
const path = require("path");
const app = express();
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

app.use(express.static(path.join(__dirname, "build")));
app.get("/*", function (req, res) {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});