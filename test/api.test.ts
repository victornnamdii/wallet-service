import chai, { expect } from "chai";
import { after, describe, it } from "mocha";
import chaiHttp from "chai-http";
import { UserModel } from "../src/models/User";
import app from "../src/server";
import { comparePassword, generateToken } from "../src/lib/helpers";
import { decrypt } from "../src/lib/crypto";

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

let token: string;
let userId: string;

describe("API Tests", function () {
  after(async () => {
    await UserModel.deleteByEmail(testUser.email);
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
        expect(res.body.data.user.lastName).to.equal("Doe");
        expect(res.body.data.user.bvn).to.equal("12345678903");
        expect(res.body.data.user.phoneNumber).to.equal("+2348101231234");
        expect(res.body.data.user.password).to.not.exist;

        const user = await UserModel.findByEmail(testUser.email);
        expect(user).to.exist;

        // Checking password stored was hashed
        expect(user!.password).to.not.equal("123456");
        expect(comparePassword("123456", user!.password!)).to.equal(true);

        // Checking the BVN stored was encrypted and can be successfully decrypted
        expect(user!.bvn).to.not.equal("12345678903");
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

        token = res.body.data.token;
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

    describe("Token Tests", () => {
      it("should get user's profile with valid token", async () => {
        const res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `Bearer ${token}`);

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

        userId = res.body.data.user.id;
      });

      it("should return invalid authorization when there's no bearer auth token", async () => {
        let res = await chai.request(app).get("/api/v1/users/profile");

        expect(res.status).to.equal(401);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Invalid Authorization");

        res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `${token}`);

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

        const expiredToken = generateToken(userId, "1s");
        const expiryTime = Date.now() + 1050;
        while (Date.now() < expiryTime);

        res = await chai
          .request(app)
          .get("/api/v1/users/profile")
          .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).to.equal(403);
        expect(res.body.data?.user).to.not.exist;
        expect(res.body.message).to.equal("Forbidden");

        const invalidToken = generateToken("invalid", "1h");
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
});
