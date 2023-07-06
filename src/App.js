import logo from './logo.svg';
import './App.css';
import React, { useState } from "react";

// make id a random int
let id = Math.floor(Math.random() * 1000000000);
var new_generation = false;
// global variable of first parent selected for crossover.
// is reset when a new parent is selected for mutation, or 
// when a second parent is selected for crossover
var crossover_parent = 0; 
const genesis_endpoint = 'http://localhost:8000/genesis';
const submit_endpoint = 'http://localhost:8000/submit_prompt';
const crossover_endpoint = 'http://localhost:8000/crossover_prompts';
const inc_gen_endpoint = 'http://localhost:8000/increment_generation/';
const get_child_endpoint= 'http://localhost:8000/get_new_children';

function sendGenesisPrompt(prompt) {
  const response = fetch(genesis_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({prompt: prompt, id: id}),
  })
  .then(r => r.json())
  .then(data => {
    console.log(data.message);
    return data.message;
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

// constantly pull new children from the server
async function getNewChildren(child_fetcher, setChildFetcher, cur_gen, setCurGen) {
  if (child_fetcher !== 0) {
    return;
  }
  setChildFetcher((state) => state+1);
  var children = []

  while (true) {
    // reset children if new generation
    if (new_generation) {
      children = [];
      new_generation = false;
    }
    var url = new URL(get_child_endpoint);
    url.search = new URLSearchParams({ident: id});
    const response = await fetch(url);
    if (response.status === 200) {
      const data = await response.json()
      if (data.children.length > 0) {
        children = children.concat(data.children);
        setCurGen(children);
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function incrementGeneration() {
  return await fetch(inc_gen_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({id: id}),
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function Square(idx, props) {
  // has attributes prompt image
  var member = props.cur_gen[idx];
  console.log(idx, props.cur_gen);
  var imgStyle = { maxHeight: "270px", maxWidth: "270px", margin: "0px" };
  var img = "";
  if (member === undefined) {
    member = { prompt: "", image: "" };
  } else {
    img = new Image();
    img.src =
      "data:image/jpg;base64," + member.image.replace(/^"(.*)"$/, "$1");

    console.log(img.src);
  }
  return (
  <div
    key={idx}
    style={{
      height: "270px",
      width: "270px",
      border: "1px solid black",
    }}
    title={member.prompt}
    onClick={(event) => {
      if (member.prompt === "") {
        return;
      }
      event.preventDefault();
      // if shift key is pressed, handle crossover
      if (event.shiftKey) {
        event.target.style.border = "4px solid green";
        if (crossover_parent === 0) {
          crossover_parent = member.prompt;
        } else if (crossover_parent === member.prompt) {
          crossover_parent = 0;
          event.target.style.border = "1px solid black";
        } else {
          // send crossover request to server
          props.setSubmittedThisGen((prev) => prev+1);
          const data = { p1: crossover_parent, p2: member.prompt, id: id };
          crossover_parent = 0;
          const response = fetch(crossover_endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
        }
      } 
      else {
        props.setSubmittedThisGen((prev) => prev+1);
        event.target.style.border = "4px solid red";
        const data = { prompt: member.prompt, id: id };
        const response = fetch(submit_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }
     
    }}
    alt={member.prompt}>
  <img src={img.src} style={imgStyle}/>
  </div>
);
}

function Grid({n, props}) {
  const squares = Array(n * n).fill(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${6}, 280px)`, gridGap: '10px' }}>
      {squares.map((square, index) => Square(index, props))}
    </div>
  );
}

function NextGenerationButton({props, grid}) {
  const [text, setText] = useState("");
  // set all image borders to all squares to black
  
  return (
    <div>
      <button 
        onClick={() => {
          incrementGeneration(props.setCurGen);
          console.log('incremented generation');
          new_generation = true;
          props.setSubmittedThisGen(0);
          props.setCurGen([]);
          props.setGenerations((prev) => prev+1);
          // set all borders of all image elements to black
          var images = document.getElementsByTagName('img');
          for (var i = 0; i < images.length; i++) {
            images[i].style.border = "1px solid black";
          }
        }}
        >
        Next Generation
      </button>
      <p>{text}</p>
    </div>
  );
}

function PromptBox({props}) {
  const [text, setText] = useState(""); // internal text before it gets submitted
  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    <button onClick={() => {
        props.setGenerations(1);
        props.setCurGen([]);
        props.setPrompt(text);
        new_generation = true;
        var prompts = sendGenesisPrompt(text);
      }}>New Genesis</button>
    <p>Generation: {props.generations}</p>
    <p>Prompt: {props.prompt}</p>
    </div>
  );
}

function App() {
  const [generations, setGenerations] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [cur_gen, setCurGen] = useState([]);
  const [child_fetcher, setChildFetcher] = useState(0);
  const [submitted_this_gen, setSubmittedThisGen] = useState(0);

  var props = {
    prompt: prompt,
    setPrompt: setPrompt,
    generations: generations,
    setGenerations: setGenerations,
    cur_gen: cur_gen,
    setCurGen: setCurGen,
    submitted_this_gen: submitted_this_gen,
    setSubmittedThisGen: setSubmittedThisGen,
  }
  getNewChildren(child_fetcher, setChildFetcher, cur_gen, setCurGen)

  var grid = Grid({n: 4, props: props});
  if (submitted_this_gen >= 4) {
    var next_gen_button = <NextGenerationButton props={props} grid={grid}/>;
  } else {
    var next_gen_button = <div></div>;
  }

  return (
    <div className="App">
    id {id}
    <PromptBox props={props} />
    Submitted {submitted_this_gen}/4 parents
    {next_gen_button}
    {grid}
    </div>
  );
}

export default App;
