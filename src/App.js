import logo from './logo.svg';
import './App.css';
import React, { useState } from "react";



/**
 * A React component that renders a square with some data.
 * @param {Object} props - The props object that contains data to render.
 * @returns {JSX.Element} A square with data.
 */
function Square(props) {
  /* data is initially a random character */
  //const text = String.fromCharCode(Math.floor(Math.random() * 26) + 97);

  const text="fsd";
  return (
    <div>
      {text}
    </div>
  );
}

/**
 * Generates an nxn grid of squares using React component.
 * @param {number} n - The size of the grid.
 * @returns {JSX.Element} A React component representing a grid of n x n squares.
 */
function Grid({ n }) {
  const squares = Array(n * n).fill(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      {squares.map((square, index) => (
        <div
          key={index}
          style={{
            height: "50px",
            border: "1px solid black",
          }}
        >{index}</div>
      ))}
    </div>
  );
}

// a react component which acts like a text box
function PromptBox(prompt, setPrompt, generations, setGenerations) {
  const [text, setText] = useState(""); // internal text before it gets submitted
  return (
    <div>
      Generation: {generations}
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    <button onClick={() => {setGenerations(1); setPrompt(text)}}>New Genesis</button>
    <p>Prompt: {prompt}</p>
    </div>
  );
}



function App() {
  const [generations, setGenerations] = useState(0);
  const [prompt, setPrompt] = useState("");

  /* Prompt lists:
   * next_gen_parents: populated by user
   * next_gen_children: populated by requests
   * cur_gen: sampled from next_gen_children for new generation
   */

  const [next_gen_parents, setNextGenParents] = useState([]);

  return (
    <div className="App">
    {PromptBox(prompt, setPrompt, generations, setGenerations)}
      <Grid n={5} />
    </div>
  );
}

export default App;
