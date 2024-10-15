FROM continuumio/miniconda3
ADD environment.yml /tmp/environment.yml
RUN apt-get update && apt-get install gcc  -y
RUN conda config --set verbosity 2
RUN conda config --describe verbosity
RUN conda env create -f /tmp/environment.yml
RUN echo "source activate $(head -1 /tmp/environment.yml | cut -d' ' -f2)" > ~/.bashrc
ENV PATH /opt/conda/envs/$(head -1 /tmp/environment.yml | cut -d' ' -f2)/bin:$PATH
RUN conda install -c conda-forge gxx
# Install ffmpeg and other binaries
RUN apt-get update && apt-get install ffmpeg libsm6 libxext6  -y
# Clone the Repo
RUN cd /home && git clone https://github.com/mitegvg/AI-Text-Prompt-to-Video-Face-Animation.git
# Install pynormalize
RUN cd /home/AI-Text-Prompt-to-Video-Face-Animation && git clone https://github.com/giannisterzopoulos/pynormalize.git && cd pynormalize && pip install .
# Install nvm and node
ENV NODE_VERSION=16.13.0
RUN apt-get update && echo "y" | apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version
RUN node -e "console.log('Running Node.js ' + process.version)"


