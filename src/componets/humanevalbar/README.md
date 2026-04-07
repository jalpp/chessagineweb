# Human Estimated Eval Bar (HEE)

This folder derives and implements a **Human Estimated Eval Bar** a method for converting a chess player's (or neural network's) predicted Win/Draw/Loss probabilities into an engine-style centipawn evaluation.

Traditional engine eval bars reflect computer certainty. This approach instead asks: *"If a human or human-like model assessed this position, what centipawn score would reflect their perception?"*

There are two variants:
- **Subjective HEE** — based on $Q_m$, scaled to $[-1, 1]$, reflecting how a human-like model (e.g. Maia) perceives the position
- **Objective HEE** — based on $Q_h$, in $[0, 1]$, reflecting raw win probability without rescaling

---

## Step 1: Quality Scores

A **quality score** compresses Win/Draw/Loss probabilities into a single scalar that represents the overall favorability of a position.

Draws are weighted at $0.5$ since they are worth half a win.

**Objective quality score $Q_m$** — rescales the result from $[0, 1]$ to $[-1, 1]$ to match the range of the Lichess sigmoid (defined in Step 2). A score of $-1$ means certain loss, $0$ is equal, and $+1$ is certain win:

$$Q_m \approx \left(\frac{P(\text{win}) + 0.5 \cdot P(\text{draw})}{P(\text{win}) + P(\text{draw}) + P(\text{loss})}\right) \cdot 2 - 1$$

**Subjective quality score $Q_h$** — the raw win expectancy in $[0, 1]$, without rescaling. This is the standard expected score used in Elo calculations, and used for subjective human prediction:

$$Q_h \approx \frac{P(\text{win}) + 0.5 \cdot P(\text{draw})}{P(\text{win}) + P(\text{draw}) + P(\text{loss})}$$

---

## Step 2: Lichess Sigmoid Function

Lichess maps centipawn evaluations to a $[-1, 1]$ win expectancy score using the following sigmoid function, where $cp$ is the centipawn evaluation:

$$Qs(cp) \approx \frac{2}{1 + e^{-0.00368208 \cdot cp}} - 1$$

This function is symmetric around $0$: a centipawn score of $0$ gives $Qs = 0$ (equal position), positive $cp$ gives positive $Qs$ (white advantage), and negative $cp$ gives negative $Qs$ (black advantage).

The constant $0.00368208$ was fit by Lichess to match human game data.

---

## Step 3: Inverting the Sigmoid — Solving for $cp$

To convert a quality score $Q$ back into centipawns, we invert the sigmoid. Setting $Qs(cp) \approx Q$ and solving step by step:

$$Q \approx \frac{2}{1 + e^{-0.00368208 \cdot cp}} - 1$$

Add $1$ to both sides:

$$Q + 1 \approx \frac{2}{1 + e^{-0.00368208 \cdot cp}}$$

Take the reciprocal:

$$1 + e^{-0.00368208 \cdot cp} \approx \frac{2}{Q + 1}$$

Isolate the exponential term:

$$e^{-0.00368208 \cdot cp} \approx \frac{2}{Q+1} - 1$$

Combine into a single fraction:

$$e^{-0.00368208 \cdot cp} \approx \frac{2 - (Q + 1)}{Q + 1}$$

$$e^{-0.00368208 \cdot cp} \approx \frac{1 - Q}{1 + Q}$$

Take the natural log of both sides:

$$-0.00368208 \cdot cp \approx \ln\!\left(\frac{1-Q}{1+Q}\right)$$

Divide both sides by $-0.00368208$:

$$cp \approx \frac{\ln\!\left(\dfrac{1-Q}{1+Q}\right)}{-0.00368208}$$

---

## Step 4: Human Equivalence Estimate Function

We define the **Human Equivalence Estimate** $HEE(Q)$ as the inverted sigmoid applied to any quality score $Q$:

$$HEE(Q) \approx \frac{\ln\!\left(\dfrac{1-Q}{1+Q}\right)}{-0.00368208}$$

This gives the centipawn value that a chess engine would assign to a position that a human or human-like model perceives as having quality $Q$.

---

## Step 5: Objective HEE (using $Q_m$)

Substituting $Q_m$ into $HEE(Q)$ gives the **objective** estimate, how a human-like neural network (e.g. Maia) perceives the position in centipawns:

$$HEE_{\text{subjective}} \approx \frac{\ln\!\left(\dfrac{1-Q_m}{1+Q_m}\right)}{-0.00368208}$$

Expanding $Q_m$ fully:

$$HEE_{\text{subjective}} \approx \frac{\ln\!\left(\dfrac{1 - \left(\dfrac{P(\text{win}) + 0.5 \cdot P(\text{draw})}{P(\text{win}) + P(\text{draw}) + P(\text{loss})} \cdot 2 - 1\right)}{1 + \left(\dfrac{P(\text{win}) + 0.5 \cdot P(\text{draw})}{P(\text{win}) + P(\text{draw}) + P(\text{loss})} \cdot 2 - 1\right)}\right)}{-0.00368208}$$

---

## Step 6: Subjective HEE (using $Q_h$)

Substituting $Q_h$ into $HEE(Q)$ gives the **Subjective** estimate, the centipawn value based on raw win expectancy, without neural net rescaling:

$$HEE_{\text{objective}} \approx \frac{\ln\!\left(\dfrac{1-Q_h}{1+Q_h}\right)}{-0.00368208}$$

Expanding $Q_h$ fully:

$$HEE_{\text{objective}} \approx \frac{\ln\!\left(\dfrac{1 - \dfrac{P(\text{win}) + 0.5 \cdot P(\text{draw})}{P(\text{win}) + P(\text{draw}) + P(\text{loss})}}{1 + \dfrac{P(\text{win}) + 0.5 \cdot P(\text{draw})}{P(\text{win}) + P(\text{draw}) + P(\text{loss})}}\right)}{-0.00368208}$$

---

## Summary

| Variant | Quality Score | Range | Interpretation |
|---|---|---|---|
| $HEE_{\text{objective}}$ | $Q_m$ | $[-1, 1]$ | Human-like model perception (e.g. Maia) |
| $HEE_{\text{subjective}}$ | $Q_h$ | $[0, 1]$ | Raw win expectancy |

Both outputs are in **centipawns**, making them directly comparable to standard engine evaluations.

## Authors

@jalpp