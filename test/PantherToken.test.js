const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const PyroToken = artifacts.require('PyroToken');

contract('PyroToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.pyro = await PyroToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.pyro.owner()), owner);
        assert.equal((await this.pyro.operator()), owner);

        await expectRevert(this.pyro.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.updatePyroSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pyro.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.pyro.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        await expectRevert(this.pyro.transferOperator(this.zeroAddress, { from: operator }), 'PYRO::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        assert.equal((await this.pyro.transferTaxRate()).toString(), '500');
        assert.equal((await this.pyro.burnRate()).toString(), '20');

        await this.pyro.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.pyro.transferTaxRate()).toString(), '0');
        await this.pyro.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.pyro.transferTaxRate()).toString(), '1000');
        await expectRevert(this.pyro.updateTransferTaxRate(1001, { from: operator }), 'PYRO::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.pyro.updateBurnRate(0, { from: operator });
        assert.equal((await this.pyro.burnRate()).toString(), '0');
        await this.pyro.updateBurnRate(100, { from: operator });
        assert.equal((await this.pyro.burnRate()).toString(), '100');
        await expectRevert(this.pyro.updateBurnRate(101, { from: operator }), 'PYRO::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        await this.pyro.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');

        await this.pyro.transfer(bob, 12345, { from: alice });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.pyro.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '494');

        await this.pyro.approve(carol, 22345, { from: alice });
        await this.pyro.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.pyro.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        await this.pyro.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');

        await this.pyro.transfer(bob, 19, { from: alice });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.pyro.balanceOf(bob)).toString(), '19');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        assert.equal((await this.pyro.transferTaxRate()).toString(), '500');
        assert.equal((await this.pyro.burnRate()).toString(), '20');

        await this.pyro.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.pyro.transferTaxRate()).toString(), '0');

        await this.pyro.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');

        await this.pyro.transfer(bob, 10000, { from: alice });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.pyro.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        assert.equal((await this.pyro.transferTaxRate()).toString(), '500');
        assert.equal((await this.pyro.burnRate()).toString(), '20');

        await this.pyro.updateBurnRate(0, { from: operator });
        assert.equal((await this.pyro.burnRate()).toString(), '0');

        await this.pyro.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');

        await this.pyro.transfer(bob, 1234, { from: alice });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.pyro.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        assert.equal((await this.pyro.transferTaxRate()).toString(), '500');
        assert.equal((await this.pyro.burnRate()).toString(), '20');

        await this.pyro.updateBurnRate(100, { from: operator });
        assert.equal((await this.pyro.burnRate()).toString(), '100');

        await this.pyro.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');

        await this.pyro.transfer(bob, 1234, { from: alice });
        assert.equal((await this.pyro.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.pyro.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.pyro.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.pyro.balanceOf(this.pyro.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.pyro.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.pyro.maxTransferAmount()).toString(), '0');

        await this.pyro.mint(alice, 1000000, { from: owner });
        assert.equal((await this.pyro.maxTransferAmount()).toString(), '5000');

        await this.pyro.mint(alice, 1000, { from: owner });
        assert.equal((await this.pyro.maxTransferAmount()).toString(), '5005');

        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        await this.pyro.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.pyro.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        assert.equal((await this.pyro.isExcludedFromAntiWhale(operator)), false);
        await this.pyro.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.pyro.isExcludedFromAntiWhale(operator)), true);

        await this.pyro.mint(alice, 10000, { from: owner });
        await this.pyro.mint(bob, 10000, { from: owner });
        await this.pyro.mint(carol, 10000, { from: owner });
        await this.pyro.mint(operator, 10000, { from: owner });
        await this.pyro.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.pyro.maxTransferAmount()).toString(), '250');
        await expectRevert(this.pyro.transfer(bob, 251, { from: alice }), 'PYRO::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.pyro.approve(carol, 251, { from: alice });
        await expectRevert(this.pyro.transferFrom(alice, carol, 251, { from: carol }), 'PYRO::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.pyro.transfer(bob, 250, { from: alice });
        await this.pyro.transferFrom(alice, carol, 250, { from: carol });

        await this.pyro.transfer(this.burnAddress, 251, { from: alice });
        await this.pyro.transfer(operator, 251, { from: alice });
        await this.pyro.transfer(owner, 251, { from: alice });
        await this.pyro.transfer(this.pyro.address, 251, { from: alice });

        await this.pyro.transfer(alice, 251, { from: operator });
        await this.pyro.transfer(alice, 251, { from: owner });
        await this.pyro.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.pyro.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.pyro.swapAndLiquifyEnabled()), false);

        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        await this.pyro.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.pyro.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.pyro.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.pyro.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.pyro.transferOperator(operator, { from: owner });
        assert.equal((await this.pyro.operator()), operator);

        await this.pyro.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.pyro.minAmountToLiquify()).toString(), '100');
    });
});
