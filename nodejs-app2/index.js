const express = require("express");
const cors = require('cors')
const app = express();

const { trace, SpanStatusCode } = require("@opentelemetry/api");

const consul = require('consul');

const CONSUL_URL = "localhost";

const SERVICE_NAME = 'servicetest11';
const SERVICE_ADDRESS = 'localhost';
const SERVICE_PORT = 5556;

const consulClient =  new consul({
    host: CONSUL_URL,
    port: 8500,
});


consulClient.agent.service.register({
    name: SERVICE_NAME,
    port: SERVICE_PORT,
    address: SERVICE_ADDRESS,
    check: {
        http: `http://host.docker.internal:${SERVICE_PORT}/health`,
        interval: '5s'
    }
}, async () => {
    await console.log(`Service ${SERVICE_NAME} registered`);
});

var kvValue = {
    "version": "11.0",
    "dependencies": [{
        "name": "test1",
        "version": "11.0"
    },
        {
            "name": "test2",
            "version": "12.0"
        },
        {
            "name": "test3",
            "version": "13.0"
        }
    ]
}

consulClient.kv.set(SERVICE_NAME, JSON.stringify(kvValue), function (err, result) {
    if (err) throw err;

});


let key ;
setInterval(function () {
    (async() => {
        key = await consulClient.kv.get(SERVICE_NAME, function (err, result) {
            if (err) throw err;
        });
    })()
}, 5000)

let servs;
(async() => {
    servs = await consulClient.agent.service.list();
})()


app.use(cors());
app.use(express.json())

app.all("/", (req, res) => {
    // Get the current span from the tracer
    const span = trace.getActiveSpan();

    err = new Error("This is a test error");
    // recordException converts the error into a span event.
    span.recordException(err);
    span.setAttribute('attribute1', 'value1');
    // Update the span status to failed.
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });

    res.json({ method: req.method, message: 'test api', ...req.body });

});

app.get('/404', (req, res) => {
    res.sendStatus(404);
})

app.get('/services', (req, res) => {
    res.json(servs);
})

app.get('/key', (req, res) => {
    res.json(key);
})

app.get('/service10', (req, res) => {
    fetch('http://' + SERVICE_ADDRESS + ':' + SERVICE_PORT + '/services')
        .then(data => {
            return data.json();
        })
        .then(json => {
            //console.log(json.servicetest10.Address);
            res.json(json.servicetest10.Address+':'+json.servicetest10.Port);
        });

})

// O consul acessa este endpoint para saber se este serviço está rodando
app.get('/health', (req, res) => {
    res.sendStatus(200);
})

app.listen(parseInt(SERVICE_PORT, 10), () => {
    console.log(`Listening for requests on http://localhost:${SERVICE_PORT}`);
});