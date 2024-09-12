# Petri Cells
## Background
This is an implementation of the sim from [this paper](https://arxiv.org/pdf/2406.19108) which explores how self-replicating programs can emerge spontaneously from cellular autonoma. I learned about the paper from [this Sabine Hossenfelder](https://www.youtube.com/watch?v=EpRRwgyeBak) video. Review those sources for more detailed descriptions of what is happening.

A given cell will be concatenated with one of its neighbors every epoch. The combined program will be executed, and the result will be split to create new cells. 

Runaway "life" only emerges occasionally, so try running the sim many times and hope to get lucky. You'll know it when you see it.

## Running Locally
```
# start the local server and navigate to the URL that is printed
make server
```
