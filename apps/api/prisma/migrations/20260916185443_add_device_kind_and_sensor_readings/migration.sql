-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('switch', 'sensor');

-- AlterTable
ALTER TABLE "device_states" ADD COLUMN     "readings" JSONB;

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "kind" "DeviceKind" NOT NULL DEFAULT 'switch';
