const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("WrappedCAM", function () {
    async function deployWrappedCAMFixture() {
        // Contracts are deployed using the first signer/account by default
        const [deployer, depositor1, depositor2, owner, spender, invalidSigner] = await ethers.getSigners();

        const WrappedCAM = await ethers.getContractFactory("WrappedCAM");
        const wrappedCAM = await WrappedCAM.deploy();

        return { wrappedCAM, deployer, depositor1, depositor2, owner, spender, invalidSigner };
    }

    // Helper to get the current chainId.
    async function getChainId() {
        return (await ethers.provider.getNetwork()).chainId;
    }

    // Returns the permit digest as defined in EIP-2612.
    async function signPermit(token, signer, owner, spender, value, nonce, deadline) {
        const name = await token.name();
        const version = "1";
        const chainId = await getChainId();
        const verifyingContract = await token.getAddress();

        const domain = {
            name,
            version,
            chainId,
            verifyingContract,
        };

        // The permit struct following EIP-2612.
        const types = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };

        const message = {
            owner: owner.address,
            spender: spender.address,
            value: value.toString(),
            nonce: nonce.toString(),
            deadline: deadline.toString(),
        };

        const signature = await signer.signTypedData(domain, types, message);

        return signature;
    }

    describe("Deployment", function () {
        it("Should set the right name and symbol", async function () {
            const { wrappedCAM } = await loadFixture(deployWrappedCAMFixture);
            expect(await wrappedCAM.name()).to.equal("Wrapped CAM");
            expect(await wrappedCAM.symbol()).to.equal("WCAM");
        });

        it("Should set the right decimals", async function () {
            const { wrappedCAM } = await loadFixture(deployWrappedCAMFixture);
            expect(await wrappedCAM.decimals()).to.equal(18);
        });

        it("Should set the right total supply", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);
            expect(await wrappedCAM.totalSupply()).to.equal(0);

            const depositAmount = ethers.parseEther("1");
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });
            expect(await wrappedCAM.totalSupply()).to.equal(depositAmount);
        });
    });

    describe("Deposit", function () {
        it("Should mint WCAM tokens on deposit() call", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // Deposit CAM.
            const depositTx = await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Check ETH balance change.
            await expect(depositTx).to.changeEtherBalances([depositor1, wrappedCAM], [-depositAmount, depositAmount]);

            // Check WCAM balance change.
            await expect(depositTx).to.changeTokenBalance(wrappedCAM, depositor1, depositAmount);

            // Check event emission.
            await expect(depositTx)
                .to.emit(wrappedCAM, "Deposit")
                .withArgs(depositor1.address, depositor1.address, depositAmount);

            // Verify token balance.
            expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(depositAmount);
        });

        it("Should mint WCAM tokens on receiving CAM directly", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("0.5");

            // Sending ETH directly to the contract triggers receive()
            const depositTx = depositor1.sendTransaction({
                to: wrappedCAM.getAddress(),
                value: depositAmount,
            });

            // Check ETH balance change.
            await expect(depositTx).to.changeEtherBalances([depositor1, wrappedCAM], [-depositAmount, depositAmount]);

            // Check WCAM balance change.
            await expect(depositTx).to.changeTokenBalance(wrappedCAM, depositor1, depositAmount);

            // Check event emission.
            await expect(depositTx)
                .to.emit(wrappedCAM, "Deposit")
                .withArgs(depositor1.address, depositor1.address, depositAmount);

            // Verify token balance.
            expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(depositAmount);
        });

        it("Should deposit consecutive deposits correctly", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount1 = ethers.parseEther("1");
            const depositAmount2 = ethers.parseEther("2");

            // Deposit CAM.
            const depositTx1 = await wrappedCAM.connect(depositor1).deposit({ value: depositAmount1 });
            await depositTx1.wait();

            const depositTx2 = await wrappedCAM.connect(depositor1).deposit({ value: depositAmount2 });
            await depositTx2.wait();

            // Check ETH balance change.
            await expect(depositTx1).to.changeEtherBalances(
                [depositor1, wrappedCAM],
                [-depositAmount1, depositAmount1],
            );
            await expect(depositTx2).to.changeEtherBalances(
                [depositor1, wrappedCAM],
                [-depositAmount2, depositAmount2],
            );

            // Check WCAM balance change.
            await expect(depositTx1).to.changeTokenBalance(wrappedCAM, depositor1, depositAmount1);
            await expect(depositTx2).to.changeTokenBalance(wrappedCAM, depositor1, depositAmount2);

            // Check event emission.
            await expect(depositTx1)
                .to.emit(wrappedCAM, "Deposit")
                .withArgs(depositor1.address, depositor1.address, depositAmount1);
            await expect(depositTx2)
                .to.emit(wrappedCAM, "Deposit")
                .withArgs(depositor1.address, depositor1.address, depositAmount2);

            // Verify token balance.
            expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(depositAmount1 + depositAmount2);
        });

        it("Should depositTo correctly", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // Deposit CAM.
            const depositTx = await wrappedCAM
                .connect(depositor1)
                .depositTo(depositor2.address, { value: depositAmount });
            await depositTx.wait();

            // Check ETH balance change.
            await expect(depositTx).to.changeEtherBalances(
                [depositor1, depositor2, wrappedCAM],
                [-depositAmount, 0, depositAmount],
            );

            // Check WCAM balance change.
            await expect(depositTx).to.changeTokenBalance(wrappedCAM, depositor2, depositAmount);

            // Check event emission.
            await expect(depositTx)
                .to.emit(wrappedCAM, "Deposit")
                .withArgs(depositor1.address, depositor2.address, depositAmount);

            // Verify token balance.
            expect(await wrappedCAM.balanceOf(depositor2.address)).to.equal(depositAmount);
        });

        it("Should revert depositTo if the recipient is the contract", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            // Attempt to depositTo the contract.
            await expect(
                wrappedCAM.connect(depositor1).depositTo(wrappedCAM.getAddress(), { value: ethers.parseEther("1") }),
            ).to.be.revertedWithCustomError(wrappedCAM, "CannotSendWCAMToThisContract");
        });

        it("Should revert depositTo if the recipient is the zero address", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            // Attempt to depositTo the zero address.
            await expect(
                wrappedCAM.connect(depositor1).depositTo(ethers.ZeroAddress, { value: ethers.parseEther("1") }),
            )
                .to.be.revertedWithCustomError(wrappedCAM, "ERC20InvalidReceiver")
                .withArgs(ethers.ZeroAddress);
        });
    });

    describe("Withdraw", function () {
        it("Should burn WCAM tokens and return native CAM", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("2");

            // Deposit CAM.
            const depositTx = await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });
            await depositTx.wait();

            // Withdraw CAM.
            const withdrawTx = await wrappedCAM.connect(depositor1).withdraw(depositAmount);

            // Check ETH balance change.
            await expect(withdrawTx).to.changeEtherBalances([depositor1, wrappedCAM], [depositAmount, -depositAmount]);

            // Check WCAM balance change.
            await expect(withdrawTx).to.changeTokenBalance(wrappedCAM, depositor1, -depositAmount);

            // Check event emission.
            await expect(withdrawTx)
                .to.emit(wrappedCAM, "Withdrawal")
                .withArgs(depositor1.address, depositor1.address, depositAmount);

            // Check Transfer event emission during burn. Note: The ERC20 Transfer event
            // is emitted when _burn is called, showing tokens being transferred from the
            // user to the zero address.
            await expect(withdrawTx)
                .to.emit(wrappedCAM, "Transfer")
                .withArgs(depositor1.address, ethers.ZeroAddress, depositAmount);

            // Verify that token balance is now zero.
            expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(0);
        });

        it("Should revert withdraw if WCAM balance is insufficient", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            // Attempt to withdraw 1 aCAM (wei).
            await expect(wrappedCAM.connect(depositor1).withdraw(1n)).to.be.revertedWithCustomError(
                wrappedCAM,
                "ERC20InsufficientBalance",
            );

            // Deposit 1 CAM.
            const depositAmount = ethers.parseEther("1");
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Attempt to withdraw 2 CAM.
            const withdrawAmount = ethers.parseEther("2");
            await expect(wrappedCAM.connect(depositor1).withdraw(withdrawAmount)).to.be.revertedWithCustomError(
                wrappedCAM,
                "ERC20InsufficientBalance",
            );
        });

        it("Should withdrawTo correctly", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // Deposit CAM.
            const depositTx = await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });
            await depositTx.wait();

            // Withdraw CAM to depositor2.
            const withdrawTx = await wrappedCAM.connect(depositor1).withdrawTo(depositor2.address, depositAmount);

            // Check ETH balance change.
            await expect(withdrawTx).to.changeEtherBalances(
                [depositor1, depositor2, wrappedCAM],
                [0, depositAmount, -depositAmount],
            );

            // Check WCAM balance change.
            await expect(withdrawTx).to.changeTokenBalance(wrappedCAM, depositor1, -depositAmount);

            // Check event emission.
            await expect(withdrawTx)
                .to.emit(wrappedCAM, "Withdrawal")
                .withArgs(depositor1.address, depositor2.address, depositAmount);

            // Check Transfer event emission during burn.
            await expect(withdrawTx)
                .to.emit(wrappedCAM, "Transfer")
                .withArgs(depositor1.address, ethers.ZeroAddress, depositAmount);
        });

        it("Should revert withdrawTo if WCAM balance is insufficient", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            // Attempt to withdrawTo 1 aCAM (wei).
            await expect(
                wrappedCAM.connect(depositor1).withdrawTo(depositor2.address, 1n),
            ).to.be.revertedWithCustomError(wrappedCAM, "ERC20InsufficientBalance");

            // Deposit 1 CAM.
            const depositAmount = ethers.parseEther("1");
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Attempt to withdrawTo 2 CAM.
            const withdrawAmount = ethers.parseEther("2");
            await expect(
                wrappedCAM.connect(depositor1).withdrawTo(depositor2.address, withdrawAmount),
            ).to.be.revertedWithCustomError(wrappedCAM, "ERC20InsufficientBalance");
        });

        it("Should revert withdrawTo if recipient is the contract", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            // Deposit CAM.
            const depositAmount = ethers.parseEther("1");
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Attempt to withdrawTo the contract.
            await expect(
                wrappedCAM.connect(depositor1).withdrawTo(wrappedCAM.getAddress(), 1n),
            ).to.be.revertedWithCustomError(wrappedCAM, "CannotSendWCAMToThisContract");
        });

        it("Should revert withdrawTo if recipient is the zero address", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            // Deposit CAM.
            const depositAmount = ethers.parseEther("1");
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Attempt to withdrawTo the zero address.
            await expect(wrappedCAM.connect(depositor1).withdrawTo(ethers.ZeroAddress, 1n))
                .to.be.revertedWithCustomError(wrappedCAM, "ERC20InvalidReceiver")
                .withArgs(ethers.ZeroAddress);
        });

        it("Should withdrawFrom correctly", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // Deposit CAM.
            const depositTx = await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });
            await depositTx.wait();

            // Allow depositor2 to withdrawFrom depositor1.
            await expect(wrappedCAM.connect(depositor1).approve(depositor2.address, depositAmount)).to.not.be.reverted;

            // Withdraw CAM from depositor1 to depositor2.
            const withdrawTx = await wrappedCAM
                .connect(depositor2)
                .withdrawFrom(depositor1.address, depositor2.address, depositAmount);

            // Check ETH balance change.
            await expect(withdrawTx).to.changeEtherBalances(
                [depositor1, depositor2, wrappedCAM],
                [0, depositAmount, -depositAmount],
            );

            // Check WCAM balance change.
            await expect(withdrawTx).to.changeTokenBalances(wrappedCAM, [depositor1, depositor2], [-depositAmount, 0]);

            // Check event emission.
            await expect(withdrawTx)
                .to.emit(wrappedCAM, "Withdrawal")
                .withArgs(depositor1.address, depositor2.address, depositAmount);

            // Check Transfer event emission during burn.
            await expect(withdrawTx)
                .to.emit(wrappedCAM, "Transfer")
                .withArgs(depositor1.address, ethers.ZeroAddress, depositAmount);
        });

        it("Should revert withdrawFrom if WCAM balance is insufficient", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");
            const allowanceAmount = ethers.parseEther("2");

            // Approve depositor2 to withdrawFrom depositor1.
            await expect(wrappedCAM.connect(depositor1).approve(depositor2.address, allowanceAmount)).to.not.be
                .reverted;

            // Attempt to withdrawFrom 1 aCAM (wei).
            await expect(
                wrappedCAM.connect(depositor2).withdrawFrom(depositor1.address, depositor2.address, 1n),
            ).to.be.revertedWithCustomError(wrappedCAM, "ERC20InsufficientBalance");

            // Deposit
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Attempt to withdrawFrom 2 CAM.
            const withdrawAmount = ethers.parseEther("2");
            await expect(
                wrappedCAM.connect(depositor2).withdrawFrom(depositor1.address, depositor2.address, withdrawAmount),
            ).to.be.revertedWithCustomError(wrappedCAM, "ERC20InsufficientBalance");
        });

        it("Should revert withdrawFrom if recipient is the contract", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // Deposit CAM.
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Allow depositor2 to withdrawFrom depositor1.
            await expect(wrappedCAM.connect(depositor1).approve(depositor2.address, depositAmount)).to.not.be.reverted;

            // Attempt to withdrawFrom the contract.
            await expect(
                wrappedCAM.connect(depositor2).withdrawFrom(depositor1.address, wrappedCAM.getAddress(), 1n),
            ).to.be.revertedWithCustomError(wrappedCAM, "CannotSendWCAMToThisContract");
        });

        it("Should revert withdrawFrom if recipient is the zero address", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // Deposit CAM.
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Allow depositor2 to withdrawFrom depositor1.
            await expect(wrappedCAM.connect(depositor1).approve(depositor2.address, depositAmount)).to.not.be.reverted;

            // Attempt to withdrawFrom the zero address.
            await expect(wrappedCAM.connect(depositor2).withdrawFrom(depositor1.address, ethers.ZeroAddress, 1n))
                .to.be.revertedWithCustomError(wrappedCAM, "ERC20InvalidReceiver")
                .withArgs(ethers.ZeroAddress);
        });
    });

    describe("Transfer Checks", function () {
        it("Should allow regular transfers between externally owned accounts", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // depositor1 deposits.
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // depositor1 transfers to depositor2.
            const transferTx = await wrappedCAM.connect(depositor1).transfer(depositor2.address, depositAmount);

            // Check WCAM balance change.
            await expect(transferTx).to.changeTokenBalances(
                wrappedCAM,
                [depositor1, depositor2],
                [-depositAmount, depositAmount],
            );

            // Check Transfer event emission.
            await expect(transferTx)
                .to.emit(wrappedCAM, "Transfer")
                .withArgs(depositor1.address, depositor2.address, depositAmount);

            // Verify token balances.
            expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(0);
            expect(await wrappedCAM.balanceOf(depositor2.address)).to.equal(depositAmount);
        });

        it("Should allow transferFrom between externally owned accounts", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // depositor1 deposits and approves depositor2.
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });
            await wrappedCAM.connect(depositor1).approve(depositor2.address, depositAmount);

            // depositor2 transfers from depositor1.
            const transferTx = await wrappedCAM
                .connect(depositor2)
                .transferFrom(depositor1.address, depositor2.address, depositAmount);

            // Check WCAM balance change.
            await expect(transferTx).to.changeTokenBalances(
                wrappedCAM,
                [depositor1, depositor2],
                [-depositAmount, depositAmount],
            );

            // Check Transfer event emission.
            await expect(transferTx)
                .to.emit(wrappedCAM, "Transfer")
                .withArgs(depositor1.address, depositor2.address, depositAmount);

            // Verify token balances.
            expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(0);
            expect(await wrappedCAM.balanceOf(depositor2.address)).to.equal(depositAmount);
        });

        it("Should prevent sending WCAM tokens to the WrappedCAM contract", async function () {
            const { wrappedCAM, depositor1 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // depositor1 deposits.
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });

            // Attempt to send WCAM tokens to the WrappedCAM contract.
            await expect(
                wrappedCAM.connect(depositor1).transfer(wrappedCAM.getAddress(), depositAmount),
            ).to.be.revertedWithCustomError(wrappedCAM, "CannotSendWCAMToThisContract");
        });

        it("Should prevent sending WCAM tokens to the WrappedCAM contract via transferFrom", async function () {
            const { wrappedCAM, depositor1, depositor2 } = await loadFixture(deployWrappedCAMFixture);

            const depositAmount = ethers.parseEther("1");

            // depositor1 deposits and approves depositor2.
            await wrappedCAM.connect(depositor1).deposit({ value: depositAmount });
            await wrappedCAM.connect(depositor1).approve(depositor2.address, depositAmount);

            // Attempt to send WCAM tokens to the WrappedCAM contract via transferFrom.
            await expect(
                wrappedCAM.connect(depositor2).transferFrom(depositor1.address, wrappedCAM.getAddress(), depositAmount),
            ).to.be.revertedWithCustomError(wrappedCAM, "CannotSendWCAMToThisContract");
        });
    });

    describe("Permit", function () {
        it("Should allow setting allowance via permit", async function () {
            const { wrappedCAM, owner, spender } = await loadFixture(deployWrappedCAMFixture);

            const value = ethers.parseEther("10");
            const nonce = await wrappedCAM.nonces(owner.address);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            // Sign the permit with the owner
            const flatSig = await signPermit(wrappedCAM, owner, owner, spender, value, nonce, deadline);
            const { v, r, s } = ethers.Signature.from(flatSig);

            // Before permit: allowance should be 0.
            expect(await wrappedCAM.allowance(owner.address, spender.address)).to.equal(0);

            // Call permit which should update the allowance.
            await expect(wrappedCAM.connect(spender).permit(owner.address, spender.address, value, deadline, v, r, s))
                .to.emit(wrappedCAM, "Approval")
                .withArgs(owner.address, spender.address, value);

            // Check that the allowance and nonce are updated.
            expect(await wrappedCAM.allowance(owner.address, spender.address)).to.equal(value);
            expect(await wrappedCAM.nonces(owner.address)).to.equal(nonce + 1n);
        });

        it("Should revert if permit deadline has passed", async function () {
            const { wrappedCAM, owner, spender } = await loadFixture(deployWrappedCAMFixture);

            const value = ethers.parseEther("10");
            const nonce = await wrappedCAM.nonces(owner.address);
            // Set deadline to a past timestamp.
            const passedDeadline = Math.floor(Date.now() / 1000) - 100;

            // Sign the permit with a past deadline
            const flatSig = await signPermit(wrappedCAM, owner, owner, spender, value, nonce, passedDeadline);
            const { v, r, s } = ethers.Signature.from(flatSig);

            // Using a deadline in the past should revert.
            await expect(
                wrappedCAM.connect(spender).permit(owner.address, spender.address, value, passedDeadline, v, r, s),
            )
                .to.be.revertedWithCustomError(wrappedCAM, "ERC2612ExpiredSignature")
                .withArgs(passedDeadline);
        });

        it("Should revert if signature is invalid", async function () {
            const { wrappedCAM, owner, spender, invalidSigner } = await loadFixture(deployWrappedCAMFixture);

            const value = ethers.parseEther("10");
            const nonce = await wrappedCAM.nonces(owner.address);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            // Sign the permit with an invalid signer
            const flatSig = await signPermit(wrappedCAM, invalidSigner, owner, spender, value, nonce, deadline);
            let { v, r, s } = ethers.Signature.from(flatSig);

            await expect(wrappedCAM.connect(spender).permit(owner.address, spender.address, value, deadline, v, r, s))
                .to.be.revertedWithCustomError(wrappedCAM, "ERC2612InvalidSigner")
                .withArgs(invalidSigner, owner.address);
        });

        it("Should revert if nonce is invalid", async function () {
            const { wrappedCAM, owner, spender } = await loadFixture(deployWrappedCAMFixture);

            const value = ethers.parseEther("10");
            const nonce = await wrappedCAM.nonces(owner.address);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            // Sign the permit with an invalid nonce
            const flatSig = await signPermit(wrappedCAM, owner, owner, spender, value, nonce + 1n, deadline);
            const { v, r, s } = ethers.Signature.from(flatSig);

            // Using an invalid nonce should revert. This call reverts with ERC2612InvalidSigner error because the
            // signature is still valid but the contract is calculating the digest with the correct nonce and we are
            // calculating the digest with the incorrect nonce.
            await expect(
                wrappedCAM.connect(spender).permit(owner.address, spender.address, value, deadline, v, r, s),
            ).to.be.revertedWithCustomError(wrappedCAM, "ERC2612InvalidSigner");
        });
    });
});
