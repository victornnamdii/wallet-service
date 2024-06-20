import chai, { expect } from "chai";
import { after, afterEach, describe, it } from "mocha";
import chaiHttp from "chai-http";
import { UserModel } from "../src/models/User";
import app from "../src/server";
import { comparePassword, generateToken } from "../src/lib/helpers";
import { decrypt, encrypt } from "../src/lib/crypto";
import { Transaction, Wallet } from "../src/@types";
import { WalletModel } from "../src/models/Wallet";
import { TransactionModel } from "../src/models/Transaction";
import { v4 } from "uuid";

chai.use(chaiHttp);

const blacklistedBVN = "12345678901";
const testUser = {
  email: "johndoe7@victor.com",
  password: "123456",
  firstName: "John",
  lastName: "Doe",
  bvn: "12345678903",
  phoneNumber: "+2348101231234",
};
const testUser2 = {
  email: "jameswave@victor.com",
  password: "123456",
  firstName: "James",
  lastName: "Wave",
  bvn: "12345678995",
  phoneNumber: "+2348101231259",
};

const getFakeWalletID = async () => {
  let id = v4();

  while ((await WalletModel.findById(id)) !== undefined) {
    id = v4();
  }

  return id;
};

let testUserToken: string;
let expiredToken: string;
let invalidToken: string;
let userId: string;
let testUserWallet: Wallet;
let testUser2Wallet: Wallet;

describe("API Tests", function () {
  after(async () => {
    await UserModel.deleteByEmail(testUser.email);
    await UserModel.deleteByEmail(testUser2.email);
  });

  describe("Auth Tests", () => {
    describe("Sign Up", () => {
      it("should successfully sign up the user", async () => {
        const res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send(testUser);

        expect(res).to.have.status(201);
        expect(res.body.message).to.equal("Successful");
        expect(res.body.data.user.email).to.equal(testUser.email);
        expect(res.body.data.user.firstName).to.equal(testUser.firstName);
        expect(res.body.data.user.lastName).to.equal(testUser.lastName);
        expect(res.body.data.user.bvn).to.equal(testUser.bvn);
        expect(res.body.data.user.phoneNumber).to.equal(testUser.phoneNumber);
        expect(res.body.data.user.password).to.not.exist;
        expect(res.body.data.wallet).to.exist;
        expect(res.body.data.wallet.userId).to.equal(res.body.data.user.id);
        expect(parseFloat(res.body.data.wallet.balance)).to.equal(0);

        userId = res.body.data.user.id;
        testUserWallet = res.body.data.wallet;

        const res2 = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send(testUser2);

        expect(res2).to.have.status(201);
        expect(res2.body.message).to.equal("Successful");
        expect(res2.body.data.user.email).to.equal(testUser2.email);
        expect(res2.body.data.user.firstName).to.equal(testUser2.firstName);
        expect(res2.body.data.user.lastName).to.equal(testUser2.lastName);
        expect(res2.body.data.user.bvn).to.equal(testUser2.bvn);
        expect(res2.body.data.user.phoneNumber).to.equal(testUser2.phoneNumber);
        expect(res2.body.data.user.password).to.not.exist;
        expect(res2.body.data.wallet).to.exist;
        expect(res2.body.data.wallet.userId).to.equal(res2.body.data.user.id);
        expect(parseFloat(res2.body.data.wallet.balance)).to.equal(0);

        testUser2Wallet = res2.body.data.wallet;

        const user = await UserModel.findByEmail(testUser.email);
        expect(user).to.exist;

        // Checking password stored was hashed
        expect(user!.password).to.not.equal(testUser.password);
        expect(comparePassword(testUser.password, user!.password!)).to.equal(
          true
        );

        // Checking the BVN stored was encrypted and can be successfully decrypted
        expect(user!.bvn).to.not.equal(testUser.bvn);
        expect(encrypt(testUser.bvn)).to.equal(user!.bvn);
        expect(decrypt(user!.bvn)).to.equal("12345678903");
      });

      it("should not register a user with duplicate email", async () => {
        const testTime = new Date();

        const res = await chai.request(app).post("/api/v1/users/signup").send({
          email: testUser.email,
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          `User with email '${testUser.email}' already exists`
        );

        const user = await UserModel.findByEmail(testUser.email);
        expect(user).to.exist;
        expect(user!.created_at! < testTime);
      });

      it("should not register a user with duplicate phoneNumber", async () => {
        const res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: testUser.phoneNumber,
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "User with phone number '+2348101231234' already exists"
        );

        const user = await UserModel.findByEmail("j@j.com");
        expect(user).to.not.exist;
      });

      it("should not register a user with duplicate BVN", async () => {
        const res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: testUser.bvn,
          phoneNumber: "+2348101231238",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "User with BVN '12345678903' already exists"
        );

        const user = await UserModel.findByEmail("j@j.com");
        expect(user).to.not.exist;
      });

      xit("should not register a user in the karma blacklist", async () => {
        const res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: blacklistedBVN,
          phoneNumber: "+2348101231238",
        });

        expect(res).to.have.status(403);
        expect(res.body.message).to.equal(
          "You have been blacklisted and not allowed to create a new account"
        );

        const user = await UserModel.findByEmail("j@j.com");
        expect(user).to.not.exist;
      });

      it("should not register a user when no valid email is specified", async () => {
        const testTime = new Date();

        let res = await chai.request(app).post("/api/v1/users/signup").send({
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid email");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "victor",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid email");

        res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send({
            email: ["victor"],
            password: "123456",
            firstName: "John",
            lastName: "Doe",
            bvn: "12345678905",
            phoneNumber: "+2348101231235",
          });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid email");

        const user = await UserModel.findByPhoneNumber("+2348101231235");
        expect(user === undefined || user!.created_at! < testTime).to.equal(
          true
        );
      });

      it("should not register a user when no valid first name is specified", async () => {
        const testTime = new Date();

        let res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid first name");

        res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send({
            email: "j@j.com",
            password: "123456",
            firstName: ["vv"],
            lastName: "Doe",
            bvn: "12345678905",
            phoneNumber: "+2348101231235",
          });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid first name");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "1234",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid first name");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid first name");

        const user = await UserModel.findByPhoneNumber("+2348101231235");
        expect(user === undefined || user!.created_at! < testTime).to.equal(
          true
        );
      });

      it("should not register a user when no valid last name is specified", async () => {
        const testTime = new Date();

        let res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid last name");

        res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send({
            email: "j@j.com",
            password: "123456",
            firstName: "John",
            lastName: ["vv"],
            bvn: "12345678905",
            phoneNumber: "+2348101231235",
          });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid last name");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "1234",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid last name");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid last name");

        const user = await UserModel.findByPhoneNumber("+2348101231235");
        expect(user === undefined || user!.created_at! < testTime).to.equal(
          true
        );
      });

      it("should not register a user when no valid password is specified", async () => {
        const testTime = new Date();

        let res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a password with at least 6 characters"
        );

        res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send({
            email: "j@j.com",
            password: ["vv"],
            firstName: "John",
            lastName: "Doe",
            bvn: "12345678905",
            phoneNumber: "+2348101231235",
          });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a password with at least 6 characters"
        );

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "12345",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678905",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a password with at least 6 characters"
        );

        const user = await UserModel.findByPhoneNumber("+2348101231235");
        expect(user === undefined || user!.created_at! < testTime).to.equal(
          true
        );
      });

      it("should not register a user when no valid BVN is specified", async () => {
        const testTime = new Date();

        let res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid BVN");

        res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send({
            email: "j@j.com",
            password: "123456",
            firstName: "John",
            lastName: "Doe",
            bvn: ["vv"],
            phoneNumber: "+2348101231235",
          });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid BVN");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "abcdefgh123",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid BVN");

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "1234567890",
          phoneNumber: "+2348101231235",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Please enter a valid BVN");

        const user = await UserModel.findByPhoneNumber("+2348101231235");
        expect(user === undefined || user!.created_at! < testTime).to.equal(
          true
        );
      });

      it("should not register a user when no valid phone number is specified", async () => {
        const testTime = new Date();

        let res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678907",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a valid phone number starting with '+' and a country code"
        );

        res = await chai
          .request(app)
          .post("/api/v1/users/signup")
          .send({
            email: "j@j.com",
            password: "123456",
            firstName: "John",
            lastName: "Doe",
            bvn: "12345678907",
            phoneNumber: ["vv"],
          });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a valid phone number starting with '+' and a country code"
        );

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678907",
          phoneNumber: "+234810123123",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a valid phone number starting with '+' and a country code"
        );

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678907",
          phoneNumber: "abcdefghj1234",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a valid phone number starting with '+' and a country code"
        );

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678907",
          phoneNumber: "2348101231234",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a valid phone number starting with '+' and a country code"
        );

        res = await chai.request(app).post("/api/v1/users/signup").send({
          email: "j@j.com",
          password: "123456",
          firstName: "John",
          lastName: "Doe",
          bvn: "12345678907",
          phoneNumber: "08101231234",
        });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          "Please enter a valid phone number starting with '+' and a country code"
        );

        const user = await UserModel.findByPhoneNumber("+2348101231235");
        expect(user === undefined || user!.created_at! < testTime).to.equal(
          true
        );
      });
    });

    describe("Log in", () => {
      it("should successfully log a user in", async () => {
        const res = await chai.request(app).post("/api/v1/users/login").send({
          email: testUser.email,
          password: testUser.password,
        });

        expect(res.status).to.equal(200);
        expect(res.body.data.token).to.exist;

        testUserToken = res.body.data.token;
      });

      it("should not log a user in when email or password is not specified", async () => {
        let res = await chai.request(app).post("/api/v1/users/login");

        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          "Please enter your email and password"
        );
        expect(res.body.data?.token).to.not.exist;

        res = await chai.request(app).post("/api/v1/users/login").send({
          email: testUser.email,
        });

        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          "Please enter your email and password"
        );
        expect(res.body.data?.token).to.not.exist;

        res = await chai.request(app).post("/api/v1/users/login").send({
          password: testUser.password,
        });

        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          "Please enter your email and password"
        );
        expect(res.body.data?.token).to.not.exist;
      });

      it("should not log a user in when invalid credentials are passed", async () => {
        let res = await chai.request(app).post("/api/v1/users/login").send({
          email: testUser.email,
          password: "1234567",
        });

        expect(res.status).to.equal(401);
        expect(res.body.message).to.equal("Email or password is incorrect");
        expect(res.body.data?.token).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/users/login")
          .send({
            email: [testUser.email],
            password: "1234567",
          });

        expect(res.status).to.equal(401);
        expect(res.body.message).to.equal("Email or password is incorrect");
        expect(res.body.data?.token).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/users/login")
          .send({
            email: testUser.email,
            password: ["test1234"],
          });

        expect(res.status).to.equal(401);
        expect(res.body.message).to.equal("Email or password is incorrect");
        expect(res.body.data?.token).to.not.exist;

        res = await chai.request(app).post("/api/v1/users/login").send({
          email: "testMail",
          password: "test1234",
        });

        expect(res.status).to.equal(401);
        expect(res.body.message).to.equal("Email or password is incorrect");
        expect(res.body.data?.token).to.not.exist;
      });
    });

    describe("Token validation", () => {
      it("should get user's profile with valid token", async () => {
        const res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).to.equal(200);
        expect(res.body.data.user).to.exist;
        expect(res.body.data.user.walletId).to.exist;
        expect(res.body.data.user.id).to.exist;
        expect(res.body.data.user.password).to.not.exist;
        expect(res.body.data.user.email).to.equal(testUser.email);
        expect(res.body.data.user.firstName).to.equal(testUser.firstName);
        expect(res.body.data.user.lastName).to.equal(testUser.lastName);
        expect(res.body.data.user.bvn).to.equal(testUser.bvn);
        expect(res.body.data.user.phoneNumber).to.equal(testUser.phoneNumber);
      });

      it("should return invalid authorization when there's no bearer auth token", async () => {
        let res = await chai.request(app).get("/api/v1/users/profile");

        expect(res.status).to.equal(401);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Invalid Authorization");

        res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `${testUserToken}`);

        expect(res.status).to.equal(401);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Invalid Authorization");

        res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", "Bearer ");

        expect(res.status).to.equal(401);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Invalid Authorization");
      });

      it("should return forbidden with invalid auth token", async () => {
        let res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", "Bearer invalidtoken");

        expect(res.status).to.equal(403);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Forbidden");

        expiredToken = generateToken(userId, "1s");
        const expiryTime = Date.now() + 1050;
        while (Date.now() < expiryTime);

        res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).to.equal(403);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Forbidden");

        invalidToken = generateToken("invalid", "1h");
        res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `Bearer ${invalidToken}`);

        expect(res.status).to.equal(403);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Forbidden");
      });
    });
  });

  describe("Wallet Tests", () => {
    afterEach(async () => {
      await TransactionModel.clearTransactions(testUserWallet.id);
      await TransactionModel.clearTransactions(testUser2Wallet.id);
    });

    describe("Get wallet details", () => {
      it("should get authenticated user's wallet", async () => {
        const res = await chai
          .request(app)
          .get("/api/v1/wallet")
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(200);
        expect(res.body.data?.wallet).to.exist;
        expect(res.body.data.wallet.userId).to.equal(userId);
        expect(res.body.data.wallet.id).to.equal(testUserWallet.id);
      });

      it("should not get wallet with no valid auth token", async () => {
        let res = await chai
          .request(app)
          .get("/api/v1/wallet")
          .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .get("/api/v1/wallet")
          .set("Authorization", `Bearer ${invalidToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai.request(app).get("/api/v1/wallet");

        expect(res.status).equal(401);
        expect(res.body.message).to.equal("Invalid Authorization");
        expect(res.body.data?.wallet).to.not.exist;
      });
    });

    describe("Fund wallet", () => {
      it("should successfully fund authenticated user's wallet", async () => {
        await WalletModel.emptyWallet(testUserWallet.id);

        const res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(201);
        expect(res.body.message).to.equal(
          "5000 successfully added to your wallet"
        );
        expect(res.body.data?.wallet).to.exist;
        expect(res.body.data.wallet.userId).to.equal(userId);
        expect(res.body.data.wallet.id).to.equal(testUserWallet.id);
        expect(res.body.data.wallet.balance).to.equal(5000);

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(5000);

        const transaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(transaction).to.exist;
        expect(parseFloat(`${transaction.amount}`)).to.equal(5000);
        expect(transaction.type).to.equal("credit");
        expect(transaction.narration).to.equal("FUND BY SELF");
      });

      it("should not fund wallet with no valid auth token attached", async () => {
        await WalletModel.emptyWallet(testUserWallet.id);
        let res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${invalidToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 5000 });

        expect(res.status).equal(401);
        expect(res.body.message).to.equal("Invalid Authorization");
        expect(res.body.data?.wallet).to.not.exist;

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`) === 0).to.equal(true);

        const transaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(transaction).to.not.exist;
      });

      it("should not fund wallet with no valid amount specified", async () => {
        let res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal("Please specify an amount");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: "5000" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: [5000] })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 0 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: -5 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 5000.788 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`) === 0).to.equal(true);

        const transaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(transaction).to.not.exist;
      });
    });

    describe("Withdraw from wallet", () => {
      it("should successfully withdraw from authenticated user's wallet", async () => {
        await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${testUserToken}`);

        const res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).to.equal(201);
        expect(res.body.message).to.equal(
          "5000 successfully debited from your wallet"
        );
        expect(res.body.data?.wallet).to.exist;
        expect(res.body.data.wallet.userId).to.equal(userId);
        expect(res.body.data.wallet.id).to.equal(testUserWallet.id);
        expect(res.body.data.wallet.balance).to.equal(0);

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(0);

        const transactions = (await TransactionModel.findAllByWalletId(
          testUserWallet.id
        )) as Transaction[];
        expect(transactions.length).to.be.equal(2);
        expect(
          transactions.every(
            (transaction) => parseFloat(`${transaction.amount}`) === 5000
          )
        ).to.equal(true);
        expect(
          transactions.some(
            (transaction) => transaction.type === "credit" && transaction.narration === "FUND BY SELF"
          )
        ).to.equal(true);
        expect(
          transactions.some(
            (transaction) => transaction.type === "debit" && transaction.narration === "WITHDRAWAL BY SELF"
          )
        ).to.equal(true);
      });

      it("should not withdraw from authenticated user's wallet with insufficient funds", async () => {
        await chai
          .request(app)
          .post("/api/v1/wallet/fund")
          .send({ amount: 3000 })
          .set("Authorization", `Bearer ${testUserToken}`);

        const res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          "You don't have enough funds for this operation"
        );
        expect(res.body.data?.wallet).to.not.exist;

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(3000);

        const transactions = (await TransactionModel.findAllByWalletId(
          testUserWallet.id
        )) as Transaction[];
        expect(transactions.length).to.be.equal(1);
        expect(
          transactions.every(
            (transaction) => parseFloat(`${transaction.amount}`) === 3000
          )
        ).to.equal(true);
        expect(
          transactions.some(
            (transaction) => transaction.type === "credit" && transaction.narration === "FUND BY SELF"
          )
        ).to.equal(true);
      });

      it("should not withdraw from wallet when no valid is amount specified", async () => {
        let res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal("Please specify an amount");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: "5000" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: [5000] })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 0 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: -5 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 5000.788 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );
        expect(res.body.data?.wallet).to.not.exist;

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(3000);

        const transaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(transaction).to.not.exist;
      });

      it("should not withdraw from wallet with no valid auth token attached", async () => {
        let res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 5000 })
          .set("Authorization", `Bearer ${invalidToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post("/api/v1/wallet/withdraw")
          .send({ amount: 5000 });

        expect(res.status).equal(401);
        expect(res.body.message).to.equal("Invalid Authorization");
        expect(res.body.data?.wallet).to.not.exist;

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(3000);

        const transaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(transaction).to.not.exist;
      });
    });

    describe("Transfer funds", () => {
      it("should successfully transfer funds to another wallet", async () => {
        const res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 2000, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(201);
        expect(res.body.data?.wallet).to.exist;
        expect(res.body.message).to.equal(
          "2000 successfully transferred to James Wave"
        );
        expect(res.body.data.wallet.userId).to.equal(userId);
        expect(res.body.data.wallet.id).to.equal(testUserWallet.id);
        expect(res.body.data.wallet.balance).to.equal(1000);
        expect(res.body.data.transaction).to.exist;
        expect(res.body.data.transaction.walletId).to.equal(testUserWallet.id);
        expect(res.body.data.transaction.amount).to.equal(2000);
        expect(res.body.data.transaction.type).to.equal("debit");
        expect(res.body.data.transaction.narration).to.equal(
          "TRF TO James Wave/For shoes"
        );

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const wallet2 = (await WalletModel.findById(
          testUser2Wallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet2.balance}`)).to.equal(2000);

        const debitTransaction = (await TransactionModel.findById(
          res.body.data.transaction.id
        )) as Transaction;
        expect(debitTransaction).to.exist;
        expect(parseFloat(`${debitTransaction.amount}`)).to.equal(2000);
        expect(debitTransaction.type).to.equal("debit");
        expect(debitTransaction.walletId).to.equal(testUserWallet.id);
        expect(debitTransaction.narration).to.equal(
          "TRF TO James Wave/For shoes"
        );

        const creditTransaction = (await TransactionModel.findByWalletId(
          testUser2Wallet.id
        )) as Transaction;

        expect(creditTransaction).to.exist;
        expect(parseFloat(`${creditTransaction.amount}`)).to.equal(2000);
        expect(creditTransaction.type).to.equal("credit");
        expect(creditTransaction.walletId).to.equal(testUser2Wallet.id);
        expect(creditTransaction.narration).to.equal(
          "TRF FROM John Doe/For shoes"
        );
      });

      it("should not allow circular transfer", async () => {
        const res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUserWallet.id}`)
          .send({ amount: 2000, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Can not perform a transfer from and to the same account"
        );

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const transaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(transaction).to.not.exist;
      });

      it("should not transfer funds without a valid narration", async () => {
        const res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 500 })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Please enter the transaction narration"
        );

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const wallet2 = (await WalletModel.findById(
          testUser2Wallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet2.balance}`)).to.equal(2000);

        const debitTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(debitTransaction).to.not.exist;

        const creditTransaction = (await TransactionModel.findByWalletId(
          testUser2Wallet.id
        )) as Transaction;
        expect(creditTransaction).to.not.exist;
      });

      it("should not transfer funds when funds are insufficient", async () => {
        const res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 50000, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "You don't have enough funds for this operation"
        );

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const wallet2 = (await WalletModel.findById(
          testUser2Wallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet2.balance}`)).to.equal(2000);

        const debitTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(debitTransaction).to.not.exist;

        const creditTransaction = (await TransactionModel.findByWalletId(
          testUser2Wallet.id
        )) as Transaction;
        expect(creditTransaction).to.not.exist;
      });

      it("should not transfer funds when the receiving wallet ID is invalid", async () => {
        const res = await chai
          .request(app)
          .post("/api/v1/wallet/transfer/invalidID")
          .send({ amount: 50, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal("Invalid Wallet ID");

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const wallet2 = (await WalletModel.findById("invalidID")) as Wallet;
        expect(wallet2).to.not.exist;

        const debitTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(debitTransaction).to.not.exist;

        const creditTransaction = (await TransactionModel.findByWalletId(
          "invalidID"
        )) as Transaction;
        expect(creditTransaction).to.not.exist;
      });

      it("should not transfer funds when the receiving wallet ID can't be found", async () => {
        const fakeId = await getFakeWalletID();

        const res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${fakeId}`)
          .send({ amount: 50, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(404);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "No wallet found with the specified ID"
        );

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const wallet2 = (await WalletModel.findById(fakeId)) as Wallet;
        expect(wallet2).to.not.exist;

        const debitTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(debitTransaction).to.not.exist;

        const creditTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(creditTransaction).to.not.exist;
      });

      it("should not transfer funds when invalid amount is specified", async () => {
        let res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal("Please specify an amount");

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: "5000", narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: [5000], narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 0, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: -5, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 50.788, narration: "For shoes" })
          .set("Authorization", `Bearer ${testUserToken}`);

        expect(res.status).equal(400);
        expect(res.body.data?.wallet).to.not.exist;
        expect(res.body.message).to.equal(
          "Amount should be a number greater than 0 with a maximum of 2 decimal places"
        );

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const debitTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(debitTransaction).to.not.exist;

        const creditTransaction = (await TransactionModel.findByWalletId(
          testUser2Wallet.id
        )) as Transaction;
        expect(creditTransaction).to.not.exist;
      });

      it("should not transfer funds when no valid auth token is attached", async () => {
        let res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 50, narration: "For shoes" })
          .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 50, narration: "For shoes" })
          .set("Authorization", `Bearer ${invalidToken}`);

        expect(res.status).equal(403);
        expect(res.body.message).to.equal("Forbidden");
        expect(res.body.data?.wallet).to.not.exist;

        res = await chai
          .request(app)
          .post(`/api/v1/wallet/transfer/${testUser2Wallet.id}`)
          .send({ amount: 50, narration: "For shoes" });

        expect(res.status).equal(401);
        expect(res.body.message).to.equal("Invalid Authorization");
        expect(res.body.data?.wallet).to.not.exist;

        const wallet = (await WalletModel.findById(
          testUserWallet.id
        )) as Wallet;
        expect(parseFloat(`${wallet.balance}`)).to.equal(1000);

        const debitTransaction = (await TransactionModel.findByWalletId(
          testUserWallet.id
        )) as Transaction;
        expect(debitTransaction).to.not.exist;

        const creditTransaction = (await TransactionModel.findByWalletId(
          testUser2Wallet.id
        )) as Transaction;
        expect(creditTransaction).to.not.exist;
      });
    });
  });
});
