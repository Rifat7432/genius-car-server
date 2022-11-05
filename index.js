const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 5000;
// middle wares

app.use(cors());
app.use(express.json());

// requests
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rdtrwss.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ massage: "unauthorize" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: "unauthorize" });
    }
    req.decoded = decoded;
    next();
  });
  7;
};

const run = async () => {
  try {
    const servicesCollection = client.db("geniusCar").collection("services");
    const ordersCollection = client.db("geniusCar").collection("orders");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page);
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      const count = await servicesCollection.estimatedDocumentCount();
      res.send({ count, services });
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const services = await servicesCollection.findOne(query);
      res.send(services);
    });

    // orders api

    app.get("/orders", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      if (decoded.user !== req.query.email) {
        return res.status(401).send({ massage: "unauthorize" });
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = ordersCollection.find(query);
      const order = await cursor.toArray();
      res.send(order);
    });

    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });
    app.delete("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const status = req.body;
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await ordersCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });
  } finally {
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("welcome to genius car");
});
app.listen(port, () => {
  console.log("server is running on port : " + port);
});
