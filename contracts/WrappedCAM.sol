// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title WrappedCAM
 * @dev ERC20 token that represents wrapped CAM. Users can deposit native CAM
 * and receive WCAM tokens, which can be redeemed (burned) in exchange for native
 * CAM.
 *
 * Also includes additional logic to prevent WCAM tokens from being transferred
 * directly to the WCAM contract itself.
 */
contract WrappedCAM is ERC20, ERC20Permit {
    using Address for address payable;

    /**
     * @notice Emitted when a deposit is made.
     * @param from The address that initiated the deposit.
     * @param value The amount of native CAM deposited.
     */
    event Deposit(address indexed from, uint256 value);

    /**
     * @notice Emitted when a withdrawal is made.
     * @param from The address that initiated the withdrawal.
     * @param value The amount of native CAM withdrawn.
     */
    event Withdrawal(address indexed from, uint256 value);

    /// @notice Error to prevent sending WCAM tokens to the contract itself.
    error CannotSendWCAMToThisContract();

    /**
     * @notice Constructor for WrappedCAM token.
     * @dev Initializes the ERC20 "Wrapped CAM" token with symbol "WCAM" and sets
     * up the EIP-2612 permit mechanism using ERC20Permit.
     */
    constructor() ERC20("Wrapped CAM", "WCAM") ERC20Permit("Wrapped CAM") {}

    /**
     * @notice Deposits native CAM and mints corresponding WCAM tokens.
     * @dev Users call this function with native CAM via the payable mechanism.
     * The contract mints WCAM tokens to the sender corresponding to the deposit,
     * and emits a Deposit event.
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraws native CAM by burning WCAM tokens.
     * @dev The sender must own at least the specified amount of WCAM tokens.
     * The function burns the WCAM tokens and sends the equivalent amount of native
     * CAM back to the sender. Emits a Withdrawal event.
     * @param amount The amount of WCAM tokens to burn (and equivalent native CAM to withdraw).
     */
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        payable(msg.sender).sendValue(amount);
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Fallback function to enable native token deposit through direct transfers
     * @dev Automatically triggers deposit() when contract receives native token
     */
    receive() external payable {
        deposit();
    }

    /**
     * @notice Overrides the transfer function of ERC20 tokens.
     * @dev Prevents sending WCAM tokens directly to the WCAM contract by reverting.
     * @param recipient The address to which tokens would be sent.
     * @param amount The amount of tokens to send.
     * @return A boolean value indicating whether the operation succeeded.
     */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        if (recipient == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        return super.transfer(recipient, amount);
    }

    /**
     * @notice Overrides the transferFrom function of ERC20 tokens.
     * @dev Prevents sending WCAM tokens directly to the WCAM contract by reverting.
     * @param sender The address from which tokens are sent.
     * @param recipient The address to which tokens are sent.
     * @param amount The amount of tokens to send.
     * @return A boolean value indicating whether the operation succeeded.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        if (recipient == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        return super.transferFrom(sender, recipient, amount);
    }
}
