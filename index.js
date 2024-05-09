const express = require('express');
const app = express()
const port = process.env.PORT || 5000



app.use(express.json())


app.get('/', (req, res)=>{
    res.send("Job Quest is comming");
    
})

app.listen(port, ()=>{
    console.log(`The server is running from the port ${port}`);
})