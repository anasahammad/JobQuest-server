const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000


const corseOption = {
  origin: ['http://localhost:5173', 'https://jobquest-73ad6.web.app', 'https://jobquest-73ad6.firebaseapp.com'],
  credentials: true,
}
app.use(cors(corseOption))
app.use(express.json())
app.use(cookieParser())


 //Token verify
 const verifyToken = (req, res, next)=>{
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({message: "unauthorized access"})
    }
    req.user = decoded
    next()
  })
 
 }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.goboxhh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobsCollection = client.db('jobquest').collection('alljobs')
    const appliedCollection = client.db('jobquest').collection('appliedJobs')
    const usersCollection = client.db('jobquest').collection('users')



    //verifyAdmin Middleware
    const verifyAdmin =async (req, res, next)=>{
      const user = req.user
      const query = {email : user?.email}
      const result = await usersCollection.findOne(query)
      if(!result || result.role !== 'admin'){
        return res.status(401).send({message: "Unauthorized Access"})
      }
      next()

    }
    //verifyHost MiddleWare
    const verifyHost =async (req, res, next)=>{
      const user = req.user
      const query = {email : user?.email}
      const result = await usersCollection.findOne(query)
      if(!result || result.role !== 'host'){
        return res.status(401).send({message: "Unauthorized Access"})
      }
      next()

    }
    //jwt token
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res
      .cookie('token', token, cookieOptions)
      .send({success : true})
    })

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    //post a job in data
    app.post('/job',   async(req, res)=>{
        const jobData = req.body;
        const result = await jobsCollection.insertOne(jobData)
        res.send(result)
    })
    //get all jobs from the database
    app.get('/jobs', async(req, res)=>{
      const page = parseInt(req.query.page) - 1;
      const size = parseInt(req.query.size);
      const filter = req.query.filter;
      const search = req?.query.search
     
      let query = {}
      if(search) {
        query.jobTitle = { $regex: search, $options: 'i' }
      }
      if(filter) query.category = filter
        const result = await jobsCollection.find(query).skip(page * size).limit(size).toArray()

        res.send(result)
    })

    //jobs by the specific owner
    app.get('/jobs/:email', verifyToken, verifyHost,  async(req, res)=>{
      const email = req.params.email;
      if( req.user?.email !== email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {'jobOwner.email' : email}
      const result = await jobsCollection.find(query).toArray()
      res.send(result)
    })

    //get a job by id
    app.get('/job/:id',  async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })
    //delete a specific job
    app.delete('/jobs/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const result = await jobsCollection.deleteOne(filter)
      res.send(result)
    })

    //update a specific job
    app.patch('/job/:id',   async(req, res)=>{
      const id = req.params.id;
      const jobData = req.body;
      console.log(jobData);
      const query = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const updateJob = {
        $set: {
          ...jobData
        }
      }
      const result = await jobsCollection.updateOne(query, updateJob, options)
      res.send(result)
    })
    //get all applied jobs from the database
    app.post('/applied', async(req, res)=>{
      const appliedJob = req.body;
      
      const query = {
        email : appliedJob.email,
        jobId : appliedJob.jobId
      }
      const alreadyApplied = await appliedCollection.findOne(query)
      if(alreadyApplied){
        return res.status(400).send("You have already applied on this job")
      }
      const result = await appliedCollection.insertOne(appliedJob)

      //update the applicants number
      const updateApplicants = {
        $inc: {applicants : 1}
      }
      const updateQuery = {_id: new ObjectId(appliedJob.jobId)}
      const updateApplicantsNumber = await jobsCollection.updateOne(updateQuery, updateApplicants)
      

      res.send(result)
    })



     //jobs by the specific user who applied a job
     app.get('/applied-jobs/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      if( req.user?.email !== email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email: email}
      const filter = req.query.filter;
     
      if(filter) query.category = filter
      const result = await appliedCollection.find(query).toArray()
      res.send(result)
     })

    app.get('/applied-jobs', async(req, res)=>{
      const result = await appliedCollection.find().toArray()
      res.send(result)
    })
  
    //pagination count
    app.get('/counts', async(req, res)=>{
      
      const count = await jobsCollection.countDocuments()
      res.send({count})
    })

    app.put('/user', async(req, res)=>{
      const user = req.body;
      const query = {email : user?.email}
      const isExist = await usersCollection.findOne(query)
      if(isExist){
        if(user.status === "Requested"){
          const result = await usersCollection.updateOne(query, {$set: {status : user?.status}})
          return res.send(result)
        }
        else{
          return res.send(isExist)
        }
      }
      if(isExist) return res.send(isExist)
      const options = {upsert : true}
      const updateDoc = {
        $set : {
          ...user,
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)

    })

    //get a single user 
      //get user
      app.get('/users/:email', async(req, res)=>{
        const email = req.params.email;
        
        const query = {email : email}
        const result = await usersCollection.findOne(query)
        res.send(result)
      })

      //update user role
    app.patch('/users/update/:email', verifyToken,  async(req, res)=>{
      const email = req.params.email;
      const user = req.body;
      const query = {email : email}
      const updatedDoc = {
        $set: {
          ...user
        }
      }
      const result = await usersCollection.updateOne(query, updatedDoc)
      res.send(result)
    })

    //get all the users
    app.get('/users', verifyToken, verifyAdmin, async(req, res)=>{
      const user = req.body;
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res)=>{
    res.send("Job Quest is comming");
    
})

app.listen(port, ()=>{
    console.log(`The server is running from the port ${port}`);
})