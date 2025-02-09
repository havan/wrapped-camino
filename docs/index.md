# Solidity API

## WrappedCAM

### Deposit

```solidity
event Deposit(address from, uint256 value)
```

### Withdrawal

```solidity
event Withdrawal(address from, uint256 value)
```

### CannotSendWCAMToThisContract

```solidity
error CannotSendWCAMToThisContract()
```

### constructor

```solidity
constructor() public
```

### deposit

```solidity
function deposit() public payable
```

### withdraw

```solidity
function withdraw(uint256 amount) external
```

### receive

```solidity
receive() external payable
```

### transfer

```solidity
function transfer(address recipient, uint256 amount) public returns (bool)
```

Override transfer to prevent sending WCAM tokens to the contract.

### transferFrom

```solidity
function transferFrom(address sender, address recipient, uint256 amount) public returns (bool)
```

Override transferFrom to prevent sending WCAM tokens to the contract.
