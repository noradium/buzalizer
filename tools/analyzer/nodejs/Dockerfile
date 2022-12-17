FROM node:16.16.0
WORKDIR /usr/src/app

RUN apt update \
  && apt upgrade -y \
  && apt install -y mecab libmecab-dev mecab-ipadic-utf8 git make curl xz-utils file sudo gcc g++

RUN git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git
RUN mecab-ipadic-neologd/bin/install-mecab-ipadic-neologd -y
