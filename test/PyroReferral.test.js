const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const PyroReferral = artifacts.require('PyroReferral');

contract('PyroReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.pyroReferral = await PyroReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.pyroReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.pyroReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.pyroReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.pyroReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.pyroReferral.operators(operator)).valueOf(), true);

        await this.pyroReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.pyroReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.pyroReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.pyroReferral.operators(operator)).valueOf(), false);
        await this.pyroReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.pyroReferral.operators(operator)).valueOf(), true);

        await this.pyroReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.pyroReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.pyroReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.pyroReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.pyroReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.pyroReferral.referralsCount(referrer)).valueOf(), '0');

        await this.pyroReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.pyroReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.pyroReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.pyroReferral.referralsCount(bob)).valueOf(), '0');
        await this.pyroReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.pyroReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.pyroReferral.getReferrer(alice)).valueOf(), referrer);

        await this.pyroReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.pyroReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.pyroReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.pyroReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.pyroReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.pyroReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.pyroReferral.operators(operator)).valueOf(), true);

        await this.pyroReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.pyroReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.pyroReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.pyroReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.pyroReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.pyroReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.pyroReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.pyroReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
