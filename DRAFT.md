# Petri Cells

### How I discovered this project

I learned about a [Sabine Hossenfelder video](https://www.youtube.com/watch?v=EpRRwgyeBak) discussing a [a paper](https://arxiv.org/pdf/2406.19108) that was released in august, discussing how “artificial life” could emerge organically from cellular automata. 

This topic sits at the intersection of several different topics which are very interesting to me - languages and computation, clever visualizations, origins of life, virtual evolution, and more. So I created an [interactive visualization](link) of the concept. This writeup will describe how the simulation works, and some of the results.

### Grid Interactions

You’ve likely heard of cellular automata from Conway’s Game of Life (example [here](link)), which delivers emergent complexity out of simple interaction rules.

There are many cellular automata variants with hard-coded rules for cell interaction. But let’s take things a step further: what if we allow variation in how the different cells on the grid behave? 

In this project, every cell is is a self-contained computer program. These programs are composed of 10 principle executable “instructions”, which I will discuss in more detail later. For the purpose of visualization, we can assign each instruction a unique color. As the default setting, each program will be 64 instructions long. Then, each program can be represented as an 8x8 square “cell”, like this.

[insert picture of a cell]

Okay. If the cells are each literally self-contained programs, what is the *programming language* of these programs? For that, we repurpose a language which, though esoteric, you may have heard of: [Brainfuck](https://en.wikipedia.org/wiki/Brainfuck). A super-minimalist language, it was made with the goal of creating the smallest possible compiler for a Turing-complete language.

Supposedly, Brainfuck (BF) wasn’t meant for practical uses, but rather as a theoretical exercise in language design. That doesn’t apply here, though, because the language is actually chosen for it’s practicality. Because the syntax is so simple, we can randomly create any program, and it will be executable.

At risk of burying this information, we aren’t actually going to be using vanilla BF, but rather, an a variant designed for programs to modify themselves, “BFF”.  

[TODO]

### brainfuck instructions, integer vs string operations

[TODO]

### Operations

But how are the programs combined? There are 3 simple stages.

1. **The programs are concatenated**, literally like concatenating arrays or strings, into one program.
2. **The program is executed**, using the compiler for BFF (self-modifying Brainfuck). Since the program makes changes to itself, the result will be a modified program.
3. The program is split in half, resulting in 2 new programs.

And the two new programs take the place of the two original programs. This process can be expressed as one line of code: `a, b = split(execBff(a + b))`.

### Virtual life

What I like about the “life” that emerges is how much of a stark phase transition it is. You don’t have to squint and imagine it. In many cases, a pattern will suddenly dominate the grid in an undeniable way.

[insert gif of life taking over]

What we quickly noticed, with the default settings (a small grid, no noise), that there are basically 2 types of life which come to dominate.

Firstly some life comes about almost immediately in the chaotic conditions under which the board in initialized, yielding some interesting patterns.

[insert gif of life taking over very early]

The second kind of life is very simple bi-color patterns which emerge later on. These are actually “sub-strings” (patterns *within* the cell) which propagate themselves outward eventually to neighboring cells, and eventually the whole grid.

[insert gif of a 2-color pattern taking over the grid]

After a while, I got bored of this, so I introduced of noise options. The options are “kill cells” and “kill instructions”.

**Kill cells** will randomly pick a certain number of cells from the grid and replace them with entirely new randomly instruction sets.

Killing cells reliably creates life. If you the program running long enough while killing cells at a 3% rate, it will always result in an interesting pattern coming to dominate the board.

[insert gif of life emerging under the condition of kill-cells noise]

I attribute this to the power of RNG. Contrary to the paper - which emphasizes plays up the interactions between the cells, and downplays the need for background random mutations - I found that, while life can indeed emerge merely from cross-cell interactions, noise definitely helps. 

How I would describe it is, after the early stage of the simulation, the game state becomes “ossified”. The cells have to become change-resistant, and there is not enough entropy in the system to support the amount of *variance* required to optimally seek out replicators. 

This explains why, under default conditions, the more interesting replicators tend to emerge early on: since the grid is randomly initialized, there is a lot of variance in the system. Later on, replicators do emerge eventually, but very simple ones, because there’s not enough bandwidth for anything more complex.

**Kill instructions** is another kind of noise. Instead of picking whole cells to kill, it will randomly replace individual instructions across the board.

Interestingly, this kind of noise will make it harder, if anything, for life to emerge in the first place - but when life does emerge, it will stimulate the change and evolutions of that life.

### super large grid