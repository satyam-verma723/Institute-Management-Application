const http=require('http')
const port=process.env.PORT || 4200;
const app=require('./app')


const server=http.createServer(app);
server.listen(port,()=>{
    console.log("app running");
}) 