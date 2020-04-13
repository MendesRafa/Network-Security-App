const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//our data format for every user
//in our application
const DataSchema = new Schema(
  {
    user: String,
    password: String,
    group: Array,
    public_key: Buffer,
    private_key: Buffer
  },
  {timestamps: true}
);

module.exports = mongoose.model("Data", DataSchema);