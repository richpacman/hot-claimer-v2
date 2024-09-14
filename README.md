# HOT Claimer v2

Automatically claiming HOT tokens from a NEAR Protocol smart contract at specified intervals.

## Features

- Multi-account support
- Configurable cooldown period between claims
- Error handling and automatic restart on failure

## Prerequisites

- Node.js LTS version
- NEAR for claiming HOT token

## Installation

Clone the repository:

```
git clone https://github.com/yourusername/hot-claimer-v2.git
cd hot-claimer-v2
```

Install dependencies:

```
npm install
```

## Usage

To start the HOT Claimer:

```
npm run start
```

The script will automatically claim HOT tokens from the HOT contract at the specified interval.

## Configuration

Insert your account id, private key and cooldown in seconds like this format in data.txt:

```
example.tg/ed25519:your_private_key/your_cooldown
```

For example:

```
helloworld.tg/ed25519:9ZRGnPajNipJqz/86400
thebeatles.tg/ed25519:qWAR8euaJfqS9yg/7200
```

86400 = 24 hours, 7200 = 2 hours. Each account is separated with newline
