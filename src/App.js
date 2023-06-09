import logo from './logo.svg';
import './App.css';
import React, { useState } from "react";

// make id a random int
let id = Math.floor(Math.random() * 1000000000);
const genesis_endpoint = 'http://localhost:8008/genesis';
const submit_endpoint = 'http://localhost:8008/submit_prompt';
const inc_gen_endpoint = 'http://localhost:8008/increment_generation/';
const get_child_endpoint= 'http://localhost:8008/get_new_children';

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

  while (true) {
    var url = new URL(get_child_endpoint);
    url.search = new URLSearchParams({ident: id});
    const response = await fetch(url);
    if (response.status === 200) {
      const data = await response.json()
      if (data.children.length > 0) {
        console.log(data.children);
        setCurGen(data.children);
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

function incrementGeneration() {
  return fetch(inc_gen_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({id: id}),
    })
  .then(r => r.status)
  .catch((error) => {
    console.error('Error:', error);
  });
}

function Square(idx, props) {
  // has attributes prompt image
  var member = props.cur_gen[idx];
  console.log(member);
  var img = "";
  if (member === undefined) {
    member = {prompt: "", image: ""};
  } else {
    img = new Image();
    img.src = 'data:image/jpg;base64,' + member.image.replace(/^"(.*)"$/, '$1');

    console.log(img.src);
  }
  return (
    <div
      key={idx}
      style={{
        height: "120px",
        border: "1px solid black",
      }}
      onClick={(event) => {
        event.preventDefault();
        event.target.style.border = "1px solid red";
        const data = {prompt: member.prompt, id: id}

        const response = fetch(submit_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        event.target.style.border = "1px solid black";
      }}
    >
    <img src={img.src} />
    </div>
  );
}

function Grid({n, props}) {
  const squares = Array(n * n).fill(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      {squares.map((square, index) => Square(index, props))}
    </div>
  );
}

function NextGenerationButton({props}) {
  const [text, setText] = useState("");
  return (
    <div>
      <button 
        onClick={() => {
          if (props.cur_gen.length > 0) {
            const status = incrementGeneration();
            console.log(status);
            if (status === 200) {
              console.log('incremented generation');
              props.setCurGen([]);
              props.setGenerations((prev) => prev+1);
              setText("");
            } else {
              console.log('failed to increment generation');
              setText("Please choose at least one parent");
            }
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

  var props = {
    prompt: prompt,
    setPrompt: setPrompt,
    generations: generations,
    setGenerations: setGenerations,
    cur_gen: cur_gen,
    setCurGen: setCurGen,
  }
  getNewChildren(child_fetcher, setChildFetcher, cur_gen, setCurGen)


  return (
    <div className="App">
    id {id}
    <PromptBox props={props} />
    <Grid n={4} props={props}/>
    <NextGenerationButton props={props} />
    </div>
  );
}

export default App;
