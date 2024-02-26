const bun = require("bun");
const httpProxy = require("http-proxy");
const fs = require("fs");
const translate = require("google-translate-api");

// Charger le dictionnaire depuis dictionary.json de manière synchrone
const dictionary = JSON.parse(fs.readFileSync("dictionary.json", "utf-8"));

// Fonction pour traduire un mot avec Google Translate
async function translateWord(word) {
  try {
    const res = await translate(word, { to: "fr" });
    return res.text;
  } catch (err) {
    console.error("Erreur de traduction:", err);
    return word;
  }
}

// Intercepter et modifier la réponse du serveur proxy
async function modifyResponse(proxyRes, req, res) {
  let body = "";
  proxyRes.on("data", (chunk) => {
    body += chunk;
  });
  proxyRes.on("end", async () => {
    try {
      for (let word in dictionary) {
        const translation = await translateWord(word);
        const regex = new RegExp(word, "g");
        body = body.replace(regex, translation);
      }
      res.end(body);
    } catch (err) {
      console.error("Erreur lors de la modification de la réponse:", err);
      res.end(body); // En cas d'erreur, renvoyer la réponse originale
    }
  });
}

// Création d'un proxy avec gestion des erreurs
const proxy = httpProxy.createProxyServer({});
proxy.on("error", (err, req, res) => {
  console.error("Erreur de proxy:", err);
  res.writeHead(500, {
    "Content-Type": "text/plain",
  });
  res.end("Erreur de proxy");
});

// Configuration du serveur local avec Bun
const server = bun.create({
  root: __dirname,
});

// Intercepter et modifier la réponse du serveur proxy
proxy.on("proxyRes", modifyResponse);

// Gestion des requêtes
server.use((req, res, next) => {
  proxy.web(req, res, { target: "http://www.dow.com" }, next);
});

// Démarrage du serveur
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Serveur proxy en cours d'exécution sur le port ${PORT}`);
});
