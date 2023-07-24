import logo from './logo.svg';
import './App.css';
import React, { useState } from "react";

// make genesis genesis_id a random int
let genesis_id = Math.floor(Math.random() * 1000000000);
var children = [[]]
var new_generation = false;
// global variable of first parent selected for crossover.
// is reset when a new parent is selected for mutation, or 
// when a second parent is selected for crossover
var crossover_parent = 0; 
var GENERATION = 0
const working_endpoint = 'http://localhost:8000/working';
const genesis_endpoint = 'http://localhost:8000/genesis';
const submit_endpoint = 'http://localhost:8000/submit_prompt';
const get_child_endpoint= 'http://localhost:8000/get_new_children';
const download_endpoint= 'http://localhost:8000/download';
const lineage_endpoint= 'http://localhost:8000/lineage';

async function getWorking(props) {

  var url = new URL(working_endpoint);
  url.search = new URLSearchParams({genesis_id: genesis_id});
  const response = await fetch(url);

  if (response.status === 200) {
    const data = await response.json()
    props.setWorking(data);
  }
}

async function updateChildren(props, children){
    // reset children if new generation
    if (GENERATION === 0 ){
      return;
    }
    props.setGenerations(GENERATION);
    while (GENERATION+1 > children.length) {
      children.push([]);
    }
    var url = new URL(get_child_endpoint);
    var pids = children[GENERATION-1].map((child) => child.pid);

    url.search = new URLSearchParams({genesis_id: genesis_id, gen: GENERATION, seen_pids: pids});
    const response = await fetch(url);
    if (response.status === 200) {
      const data = await response.json()
      if (data.length > 0) {
        children[GENERATION-1] = children[GENERATION-1].concat(data);
        props.setCurGen(children[GENERATION-1]);
      }
    }
}

// constantly pull new children from the server
async function getNewChildren(props, children) {
  if (props.child_fetcher !== 0) {
    return;
  }
  props.setChildFetcher((state) => state+1);
  while (true) {
    await updateChildren(props, children);
    await getWorking(props);
    await new Promise(r => setTimeout(r, 3000));
  }
}

function Square(idx, props) {
  // has attributes prompt image
  var member = props.cur_gen[idx];
  var imgStyle = { maxHeight: "270px", maxWidth: "270px", margin: "0px" };
  var img = "";
  if (member === undefined) {
    member = { prompt: "", image: "" };
  } else {
    img = new Image();
    img.src =
      "data:image/jpg;base64," + member.image.replace(/^"(.*)"$/, "$1");

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
          const data = { prompt: crossover_parent, prompt2: member.prompt, genesis_id: genesis_id, gen: GENERATION };
          crossover_parent = 0;
          const response = fetch(submit_endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
        }
      } 
      // if control click, request lineage in new window
      else if (event.ctrlKey) {
        const data = { pid: member.pid, genesis_id: genesis_id };
        var url = new URL(lineage_endpoint);
        url.search = new URLSearchParams(data);
        window.open(url);
      }
      else {
        event.target.style.border = "4px solid red";
        const data = { prompt: member.prompt, gen: GENERATION, genesis_id: genesis_id };
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
  const squares = Array(n).fill(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${4}, 280px)`, gridGap: '10px', justifyContent: 'center', alignItems: 'center' }}>
      {squares.map((square, index) => Square(index, props))}
    </div>
  );
}

function PrevGenerationButton({props, grid}) {
  return (
      <button 
        onClick={() => {
          new_generation = true;
          props.setCurGen(children[GENERATION-2]);
          GENERATION -= 1;
          props.setGenerations(GENERATION);
          updateChildren(props, children);
          
          // set all borders of all image elements to black
          var images = document.getElementsByTagName('img');
          for (var i = 0; i < images.length; i++) {
            images[i].style.border = "1px solid black";
          }
        }}
        disabled={GENERATION < 2}
      >
        Prev Generation
      </button>
    );
}

function NextGenerationButton({props, grid}) {
  return (
      <button 
        onClick={() => {
          new_generation = true;
          props.setCurGen(children[GENERATION]);
          GENERATION += 1;
          props.setGenerations(GENERATION);
          updateChildren(props, children);
          
          // set all borders of all image elements to black
          var images = document.getElementsByTagName('img');
          for (var i = 0; i < images.length; i++) {
            images[i].style.border = "1px solid black";
          }
        }}
        >
        Next Generation
      </button>
  );
}

function PromptBox({props}) {
  const [text, setText] = useState(""); // internal text before it gets submitted
  return (
    <div>
      <input
        placeholder="Enter a prompt, e.g. 'a cat'"
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        // onKeyPress={(event) => {
      />
    <button onClick={() => {
        GENERATION = 1;
        props.setGenerations(1);
        props.setCurGen([]);
        props.setPrompt(text);
        new_generation = true;
        fetch(genesis_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({prompt: text, genesis_id: genesis_id, gen: 0, prompt2: null})
        });
      }}>New Genesis</button>
    </div>
  );
}

function StartScreen({props}) {
  return <div className="App">
   <PromptBox props={props}/>
   <p>Welcome to PromptBreeder! Enter a prompt in the text box to start, and choose your favorite image generations.</p>
  </div>
}

function EvolutionScreen({props}) {
  var grid = Grid({n: props.cur_gen.length, props: props});

  var next_gen_button = <NextGenerationButton props={props} grid={grid}/>;
  var prev_gen_button = <PrevGenerationButton props={props} grid={grid}/>;

  return <div className="App">
    Genesis ID {genesis_id}
    <p>Genesis Prompt: {props.prompt}</p>
    <p>Generating {props.working} children...</p>

    {prev_gen_button} Generation: {props.generations} {next_gen_button}
    {grid}
  </div>


}
function App() {
  const [generations, setGenerations] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [cur_gen, setCurGen] = useState([]);
  const [child_fetcher, setChildFetcher] = useState(0);
  const [working, setWorking] = useState(0);

  var props = {
    prompt: prompt,
    setPrompt: setPrompt,
    generations: generations,
    setGenerations: setGenerations,
    cur_gen: cur_gen,
    setCurGen: setCurGen,
    child_fetcher: child_fetcher,
    setChildFetcher: setChildFetcher,
    working: working,
    setWorking: setWorking,
  }
  getNewChildren(props, children)

  
  if (GENERATION === 0) {
    return <StartScreen props={props}/>
  }
  else {
    return <EvolutionScreen props={props}/>;
  }
}

export default App;


// function download(filename, text) {
//   var element = document.createElement('a');
//   element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
//   element.setAttribute('download', filename);
//   element.style.display = 'none';
//   document.body.appendChild(element);
//   element.click();
//   document.body.removeChild(element);
// }
//
// function DownloadButton({props}) {
//   return (
//     <div>
//       <button onClick={() => {
//         var url = new URL(download_endpoint);
//         url.search = new URLSearchParams({ident: genesis_id});
//         fetch(url)
//           .then(r => r.json())
//           .then(json => {
//             var text = JSON.stringify(json);
//             download("generations.json", text);
//           })
//       }}>Download</button>
//     </div>
//   );
// }
