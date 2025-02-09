const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("WrappedCAM", function () {
  async function deployWrappedCAMFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, depositor1, depositor2] = await ethers.getSigners();

    const WrappedCAM = await ethers.getContractFactory("WrappedCAM");
    const wrappedCAM = await WrappedCAM.deploy();

    return { wrappedCAM, deployer, depositor1, depositor2 };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { wrappedCAM } = await loadFixture(deployWrappedCAMFixture);
      expect(await wrappedCAM.name()).to.equal("Wrapped CAM");
      expect(await wrappedCAM.symbol()).to.equal("WCAM");
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
      await expect(depositTx).to.emit(wrappedCAM, "Deposit").withArgs(depositor1.address, depositAmount);

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
      await expect(depositTx).to.emit(wrappedCAM, "Deposit").withArgs(depositor1.address, depositAmount);

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
      await expect(depositTx1).to.changeEtherBalances([depositor1, wrappedCAM], [-depositAmount1, depositAmount1]);
      await expect(depositTx2).to.changeEtherBalances([depositor1, wrappedCAM], [-depositAmount2, depositAmount2]);

      // Check WCAM balance change.
      await expect(depositTx1).to.changeTokenBalance(wrappedCAM, depositor1, depositAmount1);
      await expect(depositTx2).to.changeTokenBalance(wrappedCAM, depositor1, depositAmount2);

      // Check event emission.
      await expect(depositTx1).to.emit(wrappedCAM, "Deposit").withArgs(depositor1.address, depositAmount1);
      await expect(depositTx2).to.emit(wrappedCAM, "Deposit").withArgs(depositor1.address, depositAmount2);

      // Verify token balance.
      expect(await wrappedCAM.balanceOf(depositor1.address)).to.equal(depositAmount1 + depositAmount2);
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
      await expect(withdrawTx).to.emit(wrappedCAM, "Withdrawal").withArgs(depositor1.address, depositAmount);

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
});
