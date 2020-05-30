//
// This overloads console with some baggage, but I think console wont mind :)
//
// FUNCTION enable_consoleTelnet(port,welcome,passwd)
// call with port number desired, a welcome message, and a password to use
// parallel is true if you want to send stdout in parallel to the real stdout and telnet
//   at the same time, if false, then only telnet
//
// To exit remotely, type quit followed by return/enter into the telnet session
//
function enable_consoleTelnet(port,welcome,passwd,parallel) {
  console.telnetNET = require('net')
  console.telnetLogSize = 100000  //set this to be the history length
  console.telnetPassword = passwd
  console.telnet = console.telnetNET.createServer()
  console.telnetConnection = false    //this flag is true when there is a connection
  console.telnet.on('connection',startupTelnet)
  console.telnet.listen(port, function() {
    console.log('***********************************************************')
    console.log(welcome)
    console.log('Telnet listening to %j', console.telnet.address());
    console.log('***********************************************************')
    });
  console.originalStdoutWrite = process.stdout.write.bind(process.stdout);
  console.collectLog = ''
  process.stdout.write = (chunk, encoding, callback) => {
    if (typeof chunk === 'string') {
      console.collectLog += chunk   //put the chunk in the log
      if (console.collectLog.length > console.telnetLogSize) {
        console.collectLog=console.collectLog.slice(1024)  //slice 1K off the front
      }
      if (console.telnetConnection) {console.telnetConn.write(chunk)} //send to telnet if connected
    }
      if (parallel) {
        return console.originalStdoutWrite(chunk, encoding, callback)
      } else {
      return true //otherwise just return then without calling the original
    }
  }
}

//
// disable_consoleTelnet - puts everything back to normal
//
function disable_consoleTelnet() {
if (console.telnetConnection) { //if we have an active connection
  console.telnetConn.end('Alert: Program Disabled Telnet Connection\r\n')
  }
process.stdout.write = console.originalStdoutWrite
}

function startupTelnet(conn) {
  if (console.telnetConnection) {  //just one at a time!
    conn.write('Error: Too many logins\r\n')
    conn.end()
    return
  }
  console.telnetConn = conn
  console.telnetBuffer = ''  //this will hold all the characters sent to stdout
  conn.write('Password: ')   //ask the remote user for a pasword
  conn.on('data',(d)=>{     //here are the characters they send you
    console.telnetBuffer+=d;
    if (d.includes('\n')) {
      if (console.telnetBuffer == console.telnetPassword+'\r\n') { //telnet puts a <CR><LF> at the end of the line
        console.telnetConnection=true
        console.telnetBuffer=''
        conn.write(console.collectLog) //send the whole history log to the user
      } else {
        conn.end('Password Error')
      }
    } else if (d.includes('quit')) {
      console.log('remote exit')
      conn.end()
    }
  }) //do nothing on data in
  conn.on('close',()=>{
    console.telnetConnection=false
    console.log('closed Telnet')
  })
  conn.on('error',(err)=>{
    console.log('Telnet Error: '+err)})
}



//Example Usage:
//
enable_consoleTelnet(50500,'Welcome to Stdout via Telnet','mysecretshh!',false)

//
// to stop capturing
// disable_consoleTelnet()

