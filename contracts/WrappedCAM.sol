// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract WrappedCAM is ERC20, ERC20Permit {
    using Address for address payable;

    event Deposit(address indexed from, uint256 value);
    event Withdrawal(address indexed from, uint256 value);

    error CannotSendWCAMToThisContract();

    constructor() ERC20("Wrapped CAM", "WCAM") ERC20Permit("Wrapped CAM") {}

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        payable(msg.sender).sendValue(amount);
        emit Withdrawal(msg.sender, amount);
    }

    receive() external payable {
        deposit();
    }

    /**
     * @notice Override transfer to prevent sending WCAM tokens to the contract.
     */
    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (recipient == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        return super.transfer(recipient, amount);
    }

    /**
     * @notice Override transferFrom to prevent sending WCAM tokens to the contract.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (recipient == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        return super.transferFrom(sender, recipient, amount);
    }
}
