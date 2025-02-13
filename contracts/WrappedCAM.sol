// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title WrappedCAM
 * @notice WrappedCAM is an ERC20-based token that represents wrapped CAM. This
 * smart contract allows users to deposit native CAM tokens and receive WCAM tokens
 * in return. Conversely, WCAM tokens can be redeemed (burned) in exchange for their
 * equivalent value in native CAM.
 * @dev Also includes additional logic to prevent WCAM tokens from being transferred
 * directly to the WCAM contract itself.
 */
contract WrappedCAM is ERC20, ERC20Permit {
    using Address for address payable;

    /**
     * @notice Emitted when a deposit is made.
     * @param from The address that initiated the deposit.
     * @param to The address that received the deposit.
     * @param value The amount of native CAM deposited.
     */
    event Deposit(address indexed from, address indexed to, uint256 value);

    /**
     * @notice Emitted when a withdrawal is made.
     * @param from The address that initiated the withdrawal.
     * @param to The address that received the withdrawal.
     * @param value The amount of native CAM withdrawn.
     */
    event Withdrawal(address indexed from, address indexed to, uint256 value);

    /// @notice Error to prevent sending WCAM tokens to the contract itself.
    error CannotSendWCAMToThisContract();

    /**
     * @notice Constructor for WrappedCAM token.
     * @dev Initializes the ERC20 "Wrapped CAM" token with symbol "WCAM" and sets
     * up the EIP-2612 permit mechanism using ERC20Permit.
     */
    constructor() ERC20("Test Wrapped CAM", "testWCAM") ERC20Permit("Wrapped CAM") {}

    /**
     * @notice Deposits native CAM and mints corresponding WCAM tokens.
     * @dev Users call this function with native CAM via the payable mechanism.
     * The contract mints WCAM tokens to the sender corresponding to the deposit,
     * and emits a Deposit event.
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.sender, msg.value);
    }

    /**
     * @notice Deposit native CAM and mint WCAM tokens to `to` address.
     * @param to The address to receive the minted WCAM tokens.
     */
    function depositTo(address to) external payable {
        if (to == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        // `_mint` function will fail if the `to` is the zero address.
        _mint(to, msg.value);
        emit Deposit(msg.sender, to, msg.value);
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
        emit Withdrawal(msg.sender, msg.sender, amount);
    }

    /**
     * @notice Withdraw native CAM by burning caller's WCAM tokens,
     * sending the CAM to the `to` address.
     * @param to The address which will receive the native CAM.
     * @param amount The amount of WCAM tokens to burn.
     */
    function withdrawTo(address to, uint256 amount) external {
        if (to == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        // Fail if the `to` is the zero address.
        if (to == address(0)) {
            revert ERC20InvalidReceiver(to);
        }
        _burn(msg.sender, amount);
        payable(to).sendValue(amount);
        emit Withdrawal(msg.sender, to, amount);
    }

    /**
     * @notice Withdraw native CAM by burning WCAM tokens from `account` (using allowance)
     * and sending the CAM to the `to` address.
     * @param account The address from which the tokens will be burned.
     * @param to The address which will receive the native CAM.
     * @param amount The amount of WCAM tokens to burn.
     *
     * Requirements:
     * - The caller must have an allowance for `account`’s tokens of at least `amount`.
     */
    function withdrawFrom(address account, address to, uint256 amount) external {
        if (to == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        // Fail if the `to` is the zero address.
        if (to == address(0)) {
            revert ERC20InvalidReceiver(to);
        }
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        payable(to).sendValue(amount);
        emit Withdrawal(account, to, amount);
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
     * @param to The address to which tokens would be sent.
     * @param amount The amount of tokens to send.
     * @return A boolean value indicating whether the operation succeeded.
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (to == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        return super.transfer(to, amount);
    }

    /**
     * @notice Overrides the transferFrom function of ERC20 tokens.
     * @dev Prevents sending WCAM tokens directly to the WCAM contract by reverting.
     * @param sender The address from which tokens are sent.
     * @param to The address to which tokens are sent.
     * @param amount The amount of tokens to send.
     * @return A boolean value indicating whether the operation succeeded.
     */
    function transferFrom(address sender, address to, uint256 amount) public override returns (bool) {
        if (to == address(this)) {
            revert CannotSendWCAMToThisContract();
        }
        return super.transferFrom(sender, to, amount);
    }
}
