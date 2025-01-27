import "./polyfills";
import express from "express";
import { Temporal } from "@js-temporal/polyfill";

// Refactor the following code to get rid of the legacy Date class.
// Use Temporal.PlainDate instead. See /test/date_conversion.spec.mjs for examples.

function createApp(database) {
  const app = express();

  app.put("/prices", (req, res) => {
    const type = req.query.type;
    const cost = parseInt(req.query.cost);
    database.setBasePrice(type, cost);
    res.json();
  });

  app.get("/prices", (req, res) => {
    const age = req.query.age ? parseInt(req.query.age) : undefined;
    const type = req.query.type;
    const baseCost = database.findBasePriceByType(type).cost;
    const date = parseDate(req.query.date);
    const plainDate = parsePlainDate(req.query.date);
    const cost = calculateCost(age, type, date, plainDate, baseCost);
    res.json({ cost });
  });

  function parseDate(dateString) {
    if (dateString) {
      return new Date(dateString);
    }
  }

  function parsePlainDate(dateString) {
    if (dateString) {
      return Temporal.PlainDate.from(dateString);
    }
  }

  function calculateCost(age, type, date, plainDate, baseCost) {
    if (type === "night") {
      return calculateCostForNightTicket(age, baseCost);
    } else {
      return calculateCostForDayTicket(age, date, plainDate, baseCost);
    }
  }

  function calculateCostForNightTicket(age, baseCost) {
    if (age === undefined) {
      return 0;
    }
    if (age < 6) {
      return 0;
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.4);
    }
    return baseCost;
  }

  function calculateCostForDayTicket(age, date, plainDate, baseCost) {
    let reduction = calculateReduction(date, plainDate);
    if (age === undefined) {
      return Math.ceil(baseCost * (1 - reduction / 100));
    }
    if (age < 6) {
      return 0;
    }
    if (age < 15) {
      return Math.ceil(baseCost * 0.7);
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.75 * (1 - reduction / 100));
    }
    return Math.ceil(baseCost * (1 - reduction / 100));
  }

  function calculateReduction(date, plainDate) {
    let reduction = 0;
    if (plainDate && isMonday(plainDate) && !isHoliday(plainDate)) {
      reduction = 35;
    }
    return reduction;
  }

  function isMonday(plainDate) {
    return plainDate.dayOfWeek === 1;
  }

  function isHoliday(plainDate) {
    const holidays = database.getHolidays();
    for (let row of holidays) {
      let holidayPlain = Temporal.PlainDate.from(row.holiday)
      if (
        plainDate &&
        plainDate.year === holidayPlain.year &&
        plainDate.month === holidayPlain.month &&
        plainDate.day === holidayPlain.day
      ) {
        return true;
      }
    }
    return false;
  }

  return app;
}

export { createApp };
