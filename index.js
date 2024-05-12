const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

//anasahammad
//DZF90c3b8tm6c1oP
app.use(express.json())
app.use(cors())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.goboxhh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobsCollection = client.db('jobquest').collection('alljobs')
    const appliedCollection = client.db('jobquest').collection('appliedJobs')

    //post a job in data
    app.post('/job', async(req, res)=>{
        const jobData = req.body;
        const result = await jobsCollection.insertOne(jobData)
        res.send(result)
    })
    //get all jobs from the database
    app.get('/jobs', async(req, res)=>{
        const result = await jobsCollection.find().toArray()

        res.send(result)
    })

    //jobs by the specific owner
    app.get('/jobs/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {'jobOwner.email' : email}
      const result = await jobsCollection.find(query).toArray()
      res.send(result)
    })

    //get a job by id
    app.get('/job/:id', async (req, res) => {
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
    app.patch('/job/:id', async(req, res)=>{
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
     app.get('/applied-jobs/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email}
      const filter = req.query.filter;
     
      if(filter) query.category = filter
      const result = await appliedCollection.find(query).toArray()
      res.send(result)
     })

    app.get('/applied-jobs', async(req, res)=>{
      const result = await appliedCollection.find().toArray()
      res.send(result)
    })
  
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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