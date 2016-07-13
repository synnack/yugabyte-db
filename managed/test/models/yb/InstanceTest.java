// Copyright (c) Yugabyte, Inc.
package models.yb;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import helpers.FakeDBApplication;
import models.cloud.Provider;
import models.cloud.Region;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.CoreMatchers.*;
import static org.junit.Assert.*;

public class InstanceTest extends FakeDBApplication {
	private Provider defaultProvider;
	private Customer defaultCustomer;

	@Before
	public void setUp() {
		defaultCustomer = Customer.create("Test", "test@test.com", "foo");
		defaultProvider = Provider.create("Amazon");
	}

	@Test
	public void testCreate() {
		JsonNode placementInfo = Json.newObject();
		Instance inst = Instance.create(defaultCustomer, "instance 1",  placementInfo);
		assertNotNull(inst.getInstanceId());
		assertEquals(inst.name, "instance 1");
		assertTrue(inst.getPlacementInfo() instanceof  JsonNode);
	}

	@Test(expected=javax.persistence.PersistenceException.class)
	public void testInvalidCreate() {
		JsonNode placementInfo = Json.newObject();
		Instance inst = Instance.create(defaultCustomer, null, placementInfo);
		inst.save();
	}

	@Test
	public void testFind() {
		ObjectNode placementInfo = Json.newObject();
		placementInfo.put("r-factor", 3);
		placementInfo.put("single-az", true);
		placementInfo.put("prefix", "test-");
		Instance inst = Instance.create(defaultCustomer, "instance 1", placementInfo);

		Instance fetchInstance = Instance.find.where().eq("instance_id", inst.getInstanceId()).findUnique();
		assertNotNull(fetchInstance.getInstanceId());
		assertTrue(fetchInstance.getCustomerId() instanceof UUID);
		assertEquals(fetchInstance.getPlacementInfo().toString(), "{\"r-factor\":3,\"single-az\":true,\"prefix\":\"test-\"}");
	}

	@Test
	public void testAddTask() {
		JsonNode placementInfo = Json.newObject();
		Instance inst = Instance.create(defaultCustomer, "instance 1",  placementInfo);

		UUID taskUUID = UUID.randomUUID();
		inst.addTask(taskUUID, CustomerTask.TaskType.Create);

		List<CustomerTask> taskList = CustomerTask.find.where().eq("customer_uuid", defaultCustomer.uuid).findList();

		assertEquals(1, taskList.size());
		assertThat(taskList.get(0).getTaskUUID(), is(allOf(notNullValue(), equalTo(taskUUID))));
	}
}