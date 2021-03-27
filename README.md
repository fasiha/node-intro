# An Opinionated Introduction to Node.js
- [An Opinionated Introduction to Node.js](#an-opinionated-introduction-to-nodejs)
  - [Background](#background)
  - [What is Node?](#what-is-node)
  - [Why JavaScript?](#why-javascript)
  - [JavaScript, and therefore Node, is single-threaded](#javascript-and-therefore-node-is-single-threaded)
  - [However, JavaScript, and therefore Node, is asynchronous](#however-javascript-and-therefore-node-is-asynchronous)
  - [Let's see this in action](#lets-see-this-in-action)
## Background
This is the backend analogue of my [Frontend Intro](https://github.com/fasiha/frontend-intro#readme). Perhaps more than a lot of ecosystems, Node.js has a lot of cultural practices that I try to point out to others as I pair-program with them. So in this document I hope to fill in the gaps that tutorials, documentation, and Stack Overflow might leave. This may mean this document is very dense—I welcome your [feedback](https://fasiha.github.io/#contact).

We begins with a lot of prose to serve as pre-background, but then we'll start programming.

## What is Node?
Node is a runtime for the [JavaScript language](https://learnxinyminutes.com/docs/javascript/).

There are other runtimes for JavaScript, like [Deno](https://deno.land/), [GraalJS](https://github.com/oracle/graaljs), even [Nashorn](https://openjdk.java.net/jeps/335) (removed in Java 11). In this way, Node and Deno et al. are similar to
- CPython or PyPy or IronPython for the Python language, or 
- OpenJDK or GraalVM or Oracle JVM for the Java family of languages.

JavaScript and Deno are both wrappers around the same JavaScript engine: Chromium/Chrome's V8. In contrast, GraalJS is an entirely different engine. The specific words "runtime" vs "engine" might not be widely used, but the difference they represent is I think useful to keep in the back of your mind. 

The difference between these runtimes come from the libraries they provide for things *outside* the purview of the JavaScript specification, e.g., how to load files from disk, how to do network requests, etc. These are extremely important features for any backend runtime, yet the language doesn't specify how to do these. It's up to the runtime to provide library authors with the building blocks they need to make web server frameworks, etc. We'll look at how Node does these shortly.

> It might be helpful to note that there may be features that JavaScript *does* specify but that one of these runtimes *doesn't* support. Usually these are very browser-oriented features like [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) or [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API). The community may have created libraries—of various quality—to mimic these browser features in these backend runtimes.

## Why JavaScript?
JavaScript is probably one of the most widely deployed languages in the world because it is the *only* language that web browsers run. Thanks to this, web companies including Google, Mozilla, Apple, Microsoft, and Oracle and the open-source community have poured considerable resources in making very advanced JavaScript engines. This means that, in many micro-benchmarks and macro-benchmarks, JavaScript running on V8 (Chromium/Chrome's engine that also powers Node) has performance comparable to languages like C, Go, the JVM languages, etc.

My first encounter with this phenomenon I think was this [2013 blog post](https://nullprogram.com/blog/2013/02/25/):

> Whoa! It [JavaScript in Chrome] beat SBCL! I was shocked. Let’s try using C as a baseline. Surely C will be the fastest. [Narrator voice: it wasn't.]

Of course benchmarks lie and there will be all kinds of hoops you need to jump through to get *your* specific code to go fast. But JavaScript, the core language, tends to go fast.

V8, the engine underlying Node, like all other advanced language runtimes including JVM and .NET CLR, uses advanced techniques to just-in-time (JIT) compile (much of) your JavaScript down to machine code, i.e., x64 if on Intel-style chips (i7 etc.) or ARM assembly on Apple Silicon. Node's brief tutorial chapter on [V8](https://nodejs.dev/learn/the-v8-javascript-engine) may be helpful.

## JavaScript, and therefore Node, is single-threaded
There tends to be a lot of confusion around this but it's really important to note that the JavaScript language specifies a single thread of execution.

The big C++ application that is inside Node.js is of course multi-threaded: one core might be tracing and optimizing JavaScript while another is executing lightly-optimized JavaScript code while yet a third might be busy in operating system code to read a file from disk to serve a web request, etc.

However, your JavaScript code will always be executed as if it ran in a single thread, so you never have to think about threads, locks, etc.

## However, JavaScript, and therefore Node, is asynchronous
Having said all that though, Node web servers tend to be a *lot* faster than other single-threaded web servers like Flask in Python or Sinatra in Ruby because, while these slower servers *block*, JavaScript embraces non-blocking asynchronous execution.

To explain this in more detail. When, say, Flask (without any multi-threading or async to help it out) receives a GET request for a file, Python has to
- unpack the request to figure out what file to read from the disk;
- ask the operating system to give it the contents of the file on disk;
- waits for the operating system to give it the bytes on disk;
- send it to the client.
- Only now is it ready to service another request.

In contrast, Node will
- also unpack the request, but
- after it asks the operating system for the file contents and the OS goes off to get it, Node stops executing this function and can service *another* web request.
- When the operating system comes back with the file that Node asked for a few milliseconds ago (and during which Node might have advanced this sequence of steps for thousands of other requests), Node will send it to the client.

We'll see code very shortly, but in prose, the way I think of it is, any time Node has to ask the operating system or something external for something (network I/O; disk I/O; database reads/writes), it won't *block* and wait for an answer. It'll be running other Node-specific code. This is why a Node web server can have very high throughput, comparable to, say, a JVM or Go web server running on a single server.

> A non-blocking asynchronous JVM web server can leverage *multiple* threads (i.e., multiple cores) to service multiple requests *simultaneously*, which Node can't do, so a JVM web server running on 64 cores will likely be able to service far more simultaneous requests than a Node server. In these situations, people tend to run *multiple* Node instances on the same machine, with a load balancer.

## Let's see this in action
Forthcoming.