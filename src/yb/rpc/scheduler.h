//
// Copyright (c) YugaByte, Inc.
//

#ifndef YB_RPC_SCHEDULER_H
#define YB_RPC_SCHEDULER_H

#include "yb/rpc/rpc_fwd.h"

namespace yb {

class Status;

namespace rpc {

using ScheduledTaskId = int64_t;
constexpr ScheduledTaskId kUninitializedScheduledTaskId = 0;

class ScheduledTaskBase {
 public:
  explicit ScheduledTaskBase(ScheduledTaskId id, const SteadyTimePoint& time)
      : id_(id), time_(time) {}

  ScheduledTaskId id() const { return id_; }
  SteadyTimePoint time() const { return time_; }

  virtual ~ScheduledTaskBase() {}
  virtual void Run(const Status& status) = 0;

 private:
  ScheduledTaskId id_;
  SteadyTimePoint time_;
};

template<class F>
class ScheduledTask : public ScheduledTaskBase {
 public:
  explicit ScheduledTask(ScheduledTaskId id, const SteadyTimePoint& time, const F& f)
      : ScheduledTaskBase(id, time), f_(f) {}

  void Run(const Status& status) override {
    f_(status);
  }
 private:
  F f_;
};

class Scheduler {
 public:
  explicit Scheduler(IoService* io_service);
  ~Scheduler();

  template<class F>
  ScheduledTaskId Schedule(const F& f, std::chrono::steady_clock::duration delay) {
    auto time = std::chrono::steady_clock::now() + delay;
    auto id = NextId();
    DoSchedule(std::make_shared<ScheduledTask<F>>(id, time, f));
    return id;
  }

  void Abort(ScheduledTaskId task_id);

  void Shutdown();

 private:
  ScheduledTaskId NextId();

  void DoSchedule(std::shared_ptr<ScheduledTaskBase> task);

  class Impl;
  std::unique_ptr<Impl> impl_;
};

} // namespace rpc
} // namespace yb

#endif // YB_RPC_SCHEDULER_H
