const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from the current directory (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, '')));

// Fallback route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`ðŸš€ Server is running on http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop the server.`);
});
