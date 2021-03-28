# An Opinionated Introduction to Node.js
- [An Opinionated Introduction to Node.js](#an-opinionated-introduction-to-nodejs)
  - [Background](#background)
  - [What is Node?](#what-is-node)
  - [Why JavaScript?](#why-javascript)
  - [JavaScript, and therefore Node, is single-threaded](#javascript-and-therefore-node-is-single-threaded)
  - [However, JavaScript, and therefore Node, is asynchronous](#however-javascript-and-therefore-node-is-asynchronous)
  - [Let's see this in action: reading a file with callbacks](#lets-see-this-in-action-reading-a-file-with-callbacks)
  - [Node async is deterministic](#node-async-is-deterministic)
  - [Callbacks are pretty awful: Promises and async/await](#callbacks-are-pretty-awful-promises-and-asyncawait)
  - [Useful functions in the Promises API](#useful-functions-in-the-promises-api)
  - [Creating your own Promise: rare but useful](#creating-your-own-promise-rare-but-useful)
  - [Modules and require](#modules-and-require)
  - [let and const](#let-and-const)
  - [The Express.js web server](#the-expressjs-web-server)
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

## Let's see this in action: reading a file with callbacks
When I described my mental model above, how any I/O (network or disk) or operating system call (OS-level random data) or external application query (Postgres query) in Node will be async (non-blocking), I left a crucial part out: Node makes these functions *explicitly async* and there's (usually) no opt-out. You may have had to convert blocking JVM code to un-blocking—that's effectively never an issue because you can't write blocking code in Node. (This is not a Node-only thing, pretty much all JavaScript APIs, including browser, works this way.)

Let's get some code going.

Download [Node](https://nodejs.org/): you can get either the LTS (long-term support) version, with even version numbers, or the very latest version (the next odd version number). These days there's not much difference between LTS and latest so install either.

I want to show you what I mean about async (non-blocking) functions being very obvious in Node. You can run the following either
1. by saving them to a file and invoking `node file.js` (make sure you have a README.md file in the same directory for it to read), or
2. starting the Node read-eval-print loop (REPL) by running `node` and pasting them.
   - Alternatively, you can just clone this repo and run: `git clone https://github.com/fasiha/node-intro.git; cd node-intro; node file.js`

```js
// ✍️ file.js
var fs = require('fs');

var filename = 'README.md';

fs.readFile(filename, 'utf8', (err, lines) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`Characters in ${filename}: ${lines.length}`);
});

console.log('Welcome to Node!');
```

This is an old-school way of doing things—we'll get to the latest version very soon—but I want to point out that `fs` is a Node-only library that's not in Deno nor browsers (not even Chrome), though will likely be in GraalJS because it consciously matches the Node API. You will likely become quite familiar with the Node documentation, which is top-notch: https://nodejs.org/api/fs.html

Now [`fs.readFile`](https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback) takes three arguments:
- the filename,
- a string representing the encoding of the file or an options (this argument is optional, but by default, Node will read the file as a `Buffer` of raw bytes instead of a plain JavaScript string), and
- ***a callback***.

*The presence of a callback immediately tells you that `fs.readFile` is an async (non-blocking) function.*

When Node runs this script, `fs.readFile` does something quick and returns immediately, and  `Welcome to Node!` is printed.

`fs.readFile` asks the operating system for the data and registers the callback with the Node [event loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/) so that when the operating system comes back with the contents of the file, our callback gets invoked.

> N.B. Yes I used `var` instead of `let`/`const` above because `var` works much beter in the Node REPL. In quick scripts, examples, bug reports, or Stack Overflow, I'll often use `var`. Otherwise I use `let` or `const`, though the difference isn't as useful as you might think, which is why we'll talk about it below.

## Node async is deterministic
I want to highlight the fact that Node printing "Welcome …" first and then executing the callback is *fully deterministic*. You might think that, if the operating system returns the file fast enough, the callback might sometimes get invoked before the "Welcome" is printed—but this is not how Node works. Node will *never* pause execution of a function (and the topmost level of a script like this can be considered a toplevel "function"). You can be 100% confident that the function (or the entire script, in this case) will finish running and return before the callback can possibly run. Therefore, the two lines this script prints are deterministic:
```
✗ node file.js
Welcome to Node!
Characters in README.md: 8510
```

> N.B. Node offers a `fs.readFileSync` which is a synchronous (blocking) alternative that I often use in quick scripts for simplicity. Some functions have synchronous versions. For Real Code, you want to use async.
>
> N.B.2. A curious exception to the rule is [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3#why-should-i-use-this-instead-of-node-sqlite3) which presents a *synchronous* SQLite API that greatly outperforms the standard async SQLite library. This seems to be a lone case in the Node ecosystem where sync is preferable to async, as far as I know, and happens because SQLite queries are CPU-bound or serialized—with no benefit to the async paradigm and apparently (given benchmarks) significant cost.

## Callbacks are pretty awful: Promises and async/await
Callbacks used to be the only way to do async in JavaScript (and therefore Node). They are pretty awful because of callback hell, however since Node's API was finalized before we had anything better, `fs.readFile` requires a callback.

ES2015 (also known as ES6) introduced the Promises API ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises), always an invaluable resource, has a good overview), and ES2017 introduced `async`/`await`. While `async`/`await`, which are very similar to Go's goroutines or C#'s Task API.

The relationship between Promises and `async`/`await` is something I'd like to highlight: by itself the Promises API is only somewhat of an improvement over callback hell. The language support for `async`/`await` syntax was a major improvement, but this syntax wraps the Promise API, and therefore, you'll probably still become familiar with some parts of the Promise API but not others.

Let's rewrite the example above to use `async`/`await`: you can invoke this by running `node filePromises.js`.

```js
// ✍️ filePromises.js
var fs = require('fs/promises');

async function main () {
  console.log('Welcome to Node!');

  var filename = 'README.md';
  try {
    var lines = await fs.readFile(filename, 'utf8');
    console.log(`Characters in ${filename}: ${lines.length}`);
  } catch (e) {
    console.error(e);
  }
};

main();
```

We import the `fs/promises` module, whose functions return Promises. You can `await` a Promise, meaning that Node will pause execution of this function until the `await` is satisfied by its Promise getting resolved, before continuing with the rest of the function. While the Promise is unresolved, the function is suspended and Node can be busy running other functions (e.g., kicked off by concurrent requests to a web server). Node remains highly scalable, and we don't have callbacks.

In order to use `await` inside a function, we have to define the function as `async`. This means that, if you have some code that's fully synchronous, and deep inside one of the functions you decide to change something to be async, then it's possible that every caller of that function will have to become `async` as well. This is captured by a famous blog post, ["What Color is Your Function?"](http://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/) by Bob Nystrom.

Note we had to move the "Welcome to Node!" message to the top of the function if we wanted it to be printed first. Unlike callbacks which are invoked after the outer function finishes execution, `await` pauses execution of the function, so that the lines of code follow the sequence of events.

Also notice in the above how `async`/`await` allow us to use exceptions to handle errors.

## Useful functions in the Promises API
In the `async`/`await` above, you may have noticed we didn't use any functions from the `Promise` API: we just `await`ed the Promise returned by `fs/promises`'s [`readFile`](https://nodejs.org/api/fs.html#fs_fspromises_readfile_path_options).

Nonetheless, we often reach for some useful functions in the [Promise API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). For example, suppose you need the contents of three files, not just one. You could certainly loop over the files and `await` each one's contents:
```js
var filenames = ['README.md', 'file.js', 'filePromises.js'];
for (const filename of filenames) {
  const content = await fs.readFile(filename, 'utf');
  // ...
}
```
This very straightforward code has a lot to recommend it. However, one downside is that it serializes reading the three files. It might be much faster to send all three requests for data to the operating system and await them all, and [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) does that.
```js
var filenames = ['README.md', 'file.js', 'filePromises.js'];
var contents = await Promise.all(filenames.map(filename => fs.readFile(filename, 'utf8')));
```
`contents` is an array of three strings, containing the contents of each of the three files, in the same order as the `filenames` array. Notice what happened here:
1. we `map`ped over the array of filenames,
2. `fs.readFile` returns a Promise per file, so
3. the output of `map` is an *array of Promises*.
4. `Promise.all` accepts an array of Promises and returns a single Promise, which
5. we `await`.

Avoiding serializing the disk reads by iterative `await`s can be very useful. I most often reach for `Promise.all` but there are other functions in the Promises API that more infrequently are handy.

## Creating your own Promise: rare but useful
I would like to show you how to create your own Promises even though this is very infrequently needed to emphasize that you `await` a Promise, and to stress that you can't just magically manufacture asynchronicity.

The only times you need to create a Promise is to wrap an API that predates Promises. There are no great examples these days so I'll manufacture a far-fetched example:
```js
function myPromise(x) {
  return new Promise((resolve, reject) => {
    doSomething(x, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
```
The above might be very hard to read if you're not used to JavaScript lambdas. To make sure you squeeze all the juice from this example, note the following:

Our `myPromise` function returns a Promise: `return new Promise(…)`. That means, in an `async` function, we can `await myPromise(x)`!

Now. Per the Promise [docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise), the Promise constructor takes *a single argument*: `new Promise(executor)`. That single argument to the constructor is a function of two parameters, which the JavaScript runtime gives you:
1. the resolver function, conventionally called `resolve`, and
2. the rejection function, conventionally called `reject`.

Therefore, inside the body of the executor, you do whatever you need to do—in our case, call a callback-style function. But once we have the final value we want the Promise to resolve to, we invoke the resolver function with that value: above, `resolve(result)`. This is how we tell JavaScript that we're done whatever asynchronous thing we needed to do and the Promise can be resolved, and to resume executing any function that was paused by `await myPromise(x)`.

And since all functions can break, we can tell JavaScript that something went wrong by, instead of calling the resolver, by calling the rejection function with an object that can be `caught` by an `async` function.

> I often use the following little snippet in scripts (via [Stack Overflow](https://stackoverflow.com/a/39914235/)): `var sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))`. Inside an `async` function, I can just `await sleep(1000)` to pause execution for 1000 milliseconds.

I want to call your attention to something subtle: you as a JavaScript author cannot manufacture asynchronicity. If you have a big time-consuming mathematical function that blocks execution, you can't just magically make it asynchronous like this:
```js
function bigCalculation(x) {
  return new Promise(resolve => resolve(veryComplicatedMathFunction(x))); // WILL NOT HELP
}
```
JavaScript has a single thread of execution, and `veryComplicatedMathFunction` will be executed in that thread: there is no way that JavaScript can be calculating the result and servicing other requests. Node.js libraries can use operating system threads and processes to kick off work (like disk I/O which we played with above) under the hood, and we can avail ourselves of some of these techniques, but I hope it's useful to think through exactly why the above simpleminded trick won't do what you might hope it does.

We've spent a lot of time so far talking about async because that's such a core part of how I think about Node. But I do want to talk about how Node and JavaScript do modules, because that's a very sad and ugly story.

## Modules and require

## let and const

## The Express.js web server