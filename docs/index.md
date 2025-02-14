# Solidity API

## WrappedCAM

WrappedCAM is an ERC20-based token that represents wrapped CAM. This
smart contract allows users to deposit native CAM tokens and receive WCAM tokens
in return. Conversely, WCAM tokens can be redeemed (burned) in exchange for their
equivalent value in native CAM.

_ERC20 token that represents wrapped CAM. Users can deposit native CAM
and receive WCAM tokens, which can be redeemed (burned) in exchange for native
CAM. Also includes additional logic to prevent WCAM tokens from being transferred
directly to the WCAM contract itself._

### Deposit

```solidity
event Deposit(address from, address to, uint256 value)
```

Emitted when a deposit is made.

#### Parameters

| Name  | Type    | Description                             |
| ----- | ------- | --------------------------------------- |
| from  | address | The address that initiated the deposit. |
| to    | address | The address that received the deposit.  |
| value | uint256 | The amount of native CAM deposited.     |

### Withdrawal

```solidity
event Withdrawal(address from, address to, uint256 value)
```

Emitted when a withdrawal is made.

#### Parameters

| Name  | Type    | Description                                |
| ----- | ------- | ------------------------------------------ |
| from  | address | The address that initiated the withdrawal. |
| to    | address | The address that received the withdrawal.  |
| value | uint256 | The amount of native CAM withdrawn.        |

### CannotSendWCAMToThisContract

```solidity
error CannotSendWCAMToThisContract()
```

Error to prevent sending WCAM tokens to the contract itself.

### constructor

```solidity
constructor() public
```

Constructor for WrappedCAM token.

_Initializes the ERC20 "Wrapped CAM" token with symbol "WCAM" and sets
up the EIP-2612 permit mechanism using ERC20Permit._

### deposit

```solidity
function deposit() public payable
```

Deposits native CAM and mints corresponding WCAM tokens.

_Users call this function with native CAM via the payable mechanism.
The contract mints WCAM tokens to the sender corresponding to the deposit,
and emits a Deposit event._

### depositTo

```solidity
function depositTo(address to) external payable
```

Deposit native CAM and mint WCAM tokens to `to` address.

#### Parameters

| Name | Type    | Description                                    |
| ---- | ------- | ---------------------------------------------- |
| to   | address | The address to receive the minted WCAM tokens. |

### withdraw

```solidity
function withdraw(uint256 amount) external
```

Withdraws native CAM by burning WCAM tokens.

_The sender must own at least the specified amount of WCAM tokens.
The function burns the WCAM tokens and sends the equivalent amount of native
CAM back to the sender. Emits a Withdrawal event._

#### Parameters

| Name   | Type    | Description                                                                |
| ------ | ------- | -------------------------------------------------------------------------- |
| amount | uint256 | The amount of WCAM tokens to burn (and equivalent native CAM to withdraw). |

### withdrawTo

```solidity
function withdrawTo(address to, uint256 amount) external
```

Withdraw native CAM by burning caller's WCAM tokens,
sending the CAM to the `to` address.

#### Parameters

| Name   | Type    | Description                                    |
| ------ | ------- | ---------------------------------------------- |
| to     | address | The address which will receive the native CAM. |
| amount | uint256 | The amount of WCAM tokens to burn.             |

### withdrawFrom

```solidity
function withdrawFrom(address account, address to, uint256 amount) external
```

Withdraw native CAM by burning WCAM tokens from `account` (using allowance)
and sending the CAM to the `to` address.

#### Parameters

| Name    | Type    | Description                                                                                                                       |
| ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| account | address | The address from which the tokens will be burned.                                                                                 |
| to      | address | The address which will receive the native CAM.                                                                                    |
| amount  | uint256 | The amount of WCAM tokens to burn. Requirements: - The caller must have an allowance for `account`’s tokens of at least `amount`. |

### receive

```solidity
receive() external payable
```

Fallback function to enable native token deposit through direct transfers

_Automatically triggers deposit() when contract receives native token_

### transfer

```solidity
function transfer(address to, uint256 amount) public returns (bool)
```

Overrides the transfer function of ERC20 tokens.

_Prevents sending WCAM tokens directly to the WCAM contract by reverting._

#### Parameters

| Name   | Type    | Description                                |
| ------ | ------- | ------------------------------------------ |
| to     | address | The address to which tokens would be sent. |
| amount | uint256 | The amount of tokens to send.              |

#### Return Values

| Name | Type | Description                                                 |
| ---- | ---- | ----------------------------------------------------------- |
| [0]  | bool | A boolean value indicating whether the operation succeeded. |

### transferFrom

```solidity
function transferFrom(address sender, address to, uint256 amount) public returns (bool)
```

Overrides the transferFrom function of ERC20 tokens.

_Prevents sending WCAM tokens directly to the WCAM contract by reverting._

#### Parameters

| Name   | Type    | Description                             |
| ------ | ------- | --------------------------------------- |
| sender | address | The address from which tokens are sent. |
| to     | address | The address to which tokens are sent.   |
| amount | uint256 | The amount of tokens to send.           |

#### Return Values

| Name | Type | Description                                                 |
| ---- | ---- | ----------------------------------------------------------- |
| [0]  | bool | A boolean value indicating whether the operation succeeded. |
